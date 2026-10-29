import { AgentJsonConfigSchema } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import { registerSkillUsage } from '@/modules/agents/register-skill-usage';
import { AgentSkillDependency } from '@/modules/agents/entities/agent-skill-dependency.entity';
import { AgentVersionSkillDependency } from '@/modules/agents/entities/agent-version-skill-dependency.entity';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentTaskSnapshotRepository } from '@/modules/agents/repositories/agent-task-snapshot.repository';
import { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentSkillRepository } from '@/modules/agents/repositories/agent-skill.repository';
import { fromAgentDocument } from '@/modules/agents/json-config/agent-document';
import {
	createSkill,
	createSkillVersion,
	deleteSkill,
	readSkillTables,
	toSkillContent,
} from '@/modules/skills/testing';
import type { NodeTypes } from '@/node-types';
import { createOwner } from '@test-integration/db/users';

import { N8nPackageParser } from '../engine/n8n-package-parser';
import { AgentExporter } from '../entities/agent/agent.exporter';
import type { WorkflowSerializer } from '../entities/workflow/workflow.serializer';
import { DirectoryPackageReader } from '../io/directory/directory-package-reader';
import { DirectoryPackageWriter } from '../io/directory/directory-package-writer';
import { TarPackageReader } from '../io/tar/tar-package-reader';
import { TarPackageWriter } from '../io/tar/tar-package-writer';
import { PackageImportConfig } from '../n8n-packages.config';
import { ExportVersionPolicy } from '../n8n-packages.types';
import type { ManifestEntry, PackageManifest } from '../spec/manifest.schema';
import { serializedAgentSchema, type SerializedAgent } from '../spec/serialized/agent.schema';
import { serializedSkillSchema } from '../spec/serialized/skill.schema';
import { SkillExporter } from '../entities/skill/skill.exporter';
import { looseAgentsFixture } from './fixtures/agent-package-fixtures';
import { streamToBuffer } from './utils/tar-support';

const parser = new N8nPackageParser(mock<Logger>(), mock<NodeTypes>(), mock<WorkflowSerializer>());
const limits = new PackageImportConfig();
const sources: Array<{ agent: Agent; draft: SerializedAgent; published: SerializedAgent }> = [];
let project: Project;
let owner: User;
let exporter: AgentExporter;
let agentRepository: AgentRepository;
let historyRepository: AgentHistoryRepository;
let taskRepository: AgentTaskRepository;
let taskSnapshotRepository: AgentTaskSnapshotRepository;
let directory: string;

async function readSourceRecords() {
	const { manager } = agentRepository;
	return await Promise.all([
		agentRepository.find({ order: { id: 'ASC' } }),
		historyRepository.find({ order: { versionId: 'ASC' } }),
		taskRepository.find({ order: { id: 'ASC' } }),
		taskSnapshotRepository.find({ order: { versionId: 'ASC', taskId: 'ASC' } }),
		// The skill rows of the agents, so an export that changes them fails too.
		readSkillTables(),
		manager.find(AgentSkillDependency, { order: { agentId: 'ASC', skillId: 'ASC' } }),
		manager.find(AgentVersionSkillDependency, {
			order: { agentVersionId: 'ASC', skillId: 'ASC' },
		}),
	]);
}

beforeAll(async () => {
	await testModules.loadModules(['skills', 'agents']);
	await testDb.init();
	registerSkillUsage();
	agentRepository = Container.get(AgentRepository);
	historyRepository = Container.get(AgentHistoryRepository);
	taskRepository = Container.get(AgentTaskRepository);
	taskSnapshotRepository = Container.get(AgentTaskSnapshotRepository);
	exporter = Container.get(AgentExporter);
	project = await createTeamProject('Operations');
	owner = await createOwner();
	const fixture = looseAgentsFixture();
	for (const entry of fixture.manifest.agents) {
		const draft = serializedAgentSchema.parse(fixture.files[`${entry.target}/agent.json`]);
		// A skill of a saved agent is a skill of the skills module: it has its own id, no
		// `enabled` flag on the ref, and no `allowedTools`.
		const skillId = `${draft.id}_skill`;
		const { skill: draftSkill, frontmatter } = serializedSkillSchema.parse(
			fixture.files[`skills/${skillId}/skill.json`],
		);
		draft.config = {
			...AgentJsonConfigSchema.parse(draft.config),
			skills: [{ type: 'skill', id: skillId }],
		};
		const published = structuredClone(draft);
		published.config = {
			...AgentJsonConfigSchema.parse(published.config),
			instructions: 'Published configuration',
			integrations: [{ type: 'n8n_chat', credentialId: '' }],
		};
		const publishedSkill = { ...draftSkill, instructions: 'Published skill' };
		// v1 is the published text, v2 the text the draft follows.
		const { versionId: publishedSkillVersionId } = await createSkill({
			id: skillId,
			projectId: project.id,
			content: toSkillContent(publishedSkill, frontmatter),
		});
		await createSkillVersion(skillId, toSkillContent(draftSkill, frontmatter));
		published.tools.shared_tool.code = 'throw new Error("Published tool must not run");';
		published.tasks[`${entry.id}_task`] = {
			name: 'Published schedule',
			objective: 'Published objective',
			cronExpression: '0 12 * * 1',
			timezone: 'Europe/Vienna',
		};
		const agent = await agentRepository.save({
			id: draft.id,
			name: draft.name,
			projectId: project.id,
			schema: draft.config && fromAgentDocument(draft.config).config,
			tools: draft.tools,
			availableInMCP: draft.availableInMCP,
			integrations: [{ type: 'slack', credentialId: 'current-slack' }],
			versionId: `${draft.id}_draft`,
			activeVersionId: null,
			revision: 0,
		});
		await taskRepository.save(
			Object.entries(draft.tasks).map(([id, task]) => ({
				id,
				agentId: agent.id,
				...task,
			})),
		);
		const history = await historyRepository.saveVersion({
			versionId: `${agent.id}_published`,
			agentId: agent.id,
			schema: fromAgentDocument(published.config).config,
			tools: published.tools,
			publishedBy: 'Package test',
		});
		await Container.get(AgentSkillRepository).replaceDependencies(agent.id, [{ skillId }]);
		await Container.get(AgentSkillRepository).insertPins([
			{ agentVersionId: history.versionId, skillId, skillVersionId: publishedSkillVersionId },
		]);
		await taskSnapshotRepository.saveForVersion(
			Object.entries(published.tasks).map(([taskId, task]) => ({
				versionId: history.versionId,
				taskId,
				enabled: false,
				...task,
			})),
		);
		await agentRepository.setActiveVersionFenced(
			agent.id,
			agent.publicationRevision,
			history.versionId,
		);
		sources.push({ agent: (await agentRepository.findById(agent.id))!, draft, published });
	}
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	directory = await mkdtemp(path.join(tmpdir(), 'n8n-agent-export-'));
});

afterEach(async () => {
	await rm(directory, { recursive: true, force: true });
});

it.each([
	{ prefix: '', policy: ExportVersionPolicy.Latest, selected: 'draft' },
	{ prefix: '', policy: ExportVersionPolicy.PublishedStrict, selected: 'published' },
	{ prefix: 'projects/operations', policy: ExportVersionPolicy.Latest, selected: 'draft' },
	{
		prefix: 'projects/operations',
		policy: ExportVersionPolicy.PublishedStrict,
		selected: 'published',
	},
] as const)(
	'round-trips $selected definitions at "$prefix" without changing source records',
	async ({ prefix, policy, selected }) => {
		const before = await readSourceRecords();
		const archive = new TarPackageWriter();
		const loose = new DirectoryPackageWriter(directory);
		const entries: ManifestEntry[] = [];
		const skillUsers: Array<{ agentId: string; projectId: string; skillIds: string[] }> = [];
		for (const { agent } of sources) {
			const snapshot = (await exporter.prepare(agent, policy))!;
			expect(snapshot.projectId).toBe(project.id);
			const entry = await exporter.write(snapshot, archive, prefix);
			expect(await exporter.write(snapshot, loose, prefix)).toEqual(entry);
			entries.push(entry);
			skillUsers.push({
				agentId: agent.id,
				projectId: project.id,
				skillIds: (snapshot.content.config?.skills ?? []).map(({ id }) => id),
			});
		}
		const projectTargetsById = prefix ? new Map([[project.id, prefix]]) : undefined;
		const skillExporter = Container.get(SkillExporter);
		const skillEntries = await skillExporter.export({
			user: owner,
			writer: archive,
			agents: skillUsers,
			projectTargetsById,
		});
		expect(
			await skillExporter.export({
				user: owner,
				writer: loose,
				agents: skillUsers,
				projectTargetsById,
			}),
		).toEqual(skillEntries);
		const manifest: PackageManifest = {
			...looseAgentsFixture().manifest,
			agents: entries,
			skills: skillEntries,
			requirements: undefined,
			projects: prefix ? [{ id: project.id, name: project.name, target: prefix }] : undefined,
		};
		for (const writer of [archive, loose]) {
			await writer.writeFile('manifest.json', JSON.stringify(manifest));
			if (prefix)
				await writer.writeFile(
					`${prefix}/project.json`,
					JSON.stringify({ id: project.id, name: project.name }),
				);
		}
		const archiveReader = new TarPackageReader(await streamToBuffer(archive.finalize()), limits);
		const directoryReader = new DirectoryPackageReader(directory, limits);
		await directoryReader.listEntries();
		const basePrefix = prefix ? `${prefix}/` : '';
		const parsed = await parser.getAgents(archiveReader, basePrefix);
		expect(await parser.getAgents(directoryReader, basePrefix)).toEqual(parsed);
		expect(parsed).toHaveLength(2);
		for (const [index, source] of sources.entries()) {
			const { id, ...content } = source[selected];
			const integrations = [{ type: 'slack', credentialId: 'current-slack' }];
			if (selected === 'published') integrations.push({ type: 'n8n_chat', credentialId: '' });
			expect(parsed[index]).toEqual({
				...content,
				sourceAgentId: id,
				config: { ...content.config, integrations },
				metadata: {
					versionId: selected === 'draft' ? source.agent.versionId : source.agent.activeVersionId,
					publishedVersionId: source.agent.activeVersionId,
				},
			});
		}
		// Every policy exports the latest saved skill version, with its frontmatter.
		const skills = await parser.getSkills(archiveReader);
		expect(await parser.getSkills(directoryReader)).toEqual(skills);
		expect(skillEntries.every(({ target }) => target.startsWith(`${basePrefix}skills/`))).toBe(
			true,
		);
		expect(skills).toEqual(
			sources.map(({ agent }) => ({
				id: `${agent.id}_skill`,
				scope: 'project',
				skill: expect.objectContaining({ instructions: 'Read references/guide.md.' }),
				frontmatter: { license: 'MIT' },
			})),
		);
		expect(await readSourceRecords()).toEqual(before);
	},
);

it('exports a skill whose ID contains hyphens', async () => {
	const body = { name: 'Release notes', description: 'Notes.', instructions: 'Write notes.' };
	await createSkill({
		id: 'release-notes',
		projectId: project.id,
		source: 'agent',
		content: toSkillContent(body),
	});
	const writer = new DirectoryPackageWriter(directory);
	const entries = await Container.get(SkillExporter).export({
		user: owner,
		writer,
		agents: [{ agentId: sources[0].agent.id, projectId: project.id, skillIds: ['release-notes'] }],
	});
	expect(entries).toEqual([
		{ id: 'release-notes', name: 'Release notes', target: 'skills/release-notes-release-notes' },
	]);
	await deleteSkill('release-notes');
});

it('rejects a stale draft through the definition service', async () => {
	const agent = sources[0].agent;
	await expect(exporter.prepare({ ...agent, revision: agent.revision - 1 })).rejects.toThrow(
		ConflictError,
	);
});
