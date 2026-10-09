import { AgentJsonConfigSchema } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentTaskSnapshotRepository } from '@/modules/agents/repositories/agent-task-snapshot.repository';
import { AgentTaskRepository } from '@/modules/agents/repositories/agent-task.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import type { NodeTypes } from '@/node-types';

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
import { looseAgentsFixture } from './fixtures/agent-package-fixtures';
import { streamToBuffer } from './utils/tar-support';

const parser = new N8nPackageParser(mock<Logger>(), mock<NodeTypes>(), mock<WorkflowSerializer>());
const limits = new PackageImportConfig();
const sources: Array<{ agent: Agent; draft: SerializedAgent; published: SerializedAgent }> = [];
let project: Project;
let exporter: AgentExporter;
let agentRepository: AgentRepository;
let historyRepository: AgentHistoryRepository;
let taskRepository: AgentTaskRepository;
let taskSnapshotRepository: AgentTaskSnapshotRepository;
let directory: string;

async function readSourceRecords() {
	return await Promise.all([
		agentRepository.find({ order: { id: 'ASC' } }),
		historyRepository.find({ order: { versionId: 'ASC' } }),
		taskRepository.find({ order: { id: 'ASC' } }),
		taskSnapshotRepository.find({ order: { versionId: 'ASC', taskId: 'ASC' } }),
	]);
}

beforeAll(async () => {
	await testModules.loadModules(['agents']);
	await testDb.init();
	agentRepository = Container.get(AgentRepository);
	historyRepository = Container.get(AgentHistoryRepository);
	taskRepository = Container.get(AgentTaskRepository);
	taskSnapshotRepository = Container.get(AgentTaskSnapshotRepository);
	exporter = Container.get(AgentExporter);
	project = await createTeamProject('Operations');
	const fixture = looseAgentsFixture();
	for (const entry of fixture.manifest.agents) {
		const draft = serializedAgentSchema.parse(fixture.files[`${entry.target}/agent.json`]);
		const published = structuredClone(draft);
		published.config = {
			...AgentJsonConfigSchema.parse(published.config),
			instructions: 'Published configuration',
			integrations: [{ type: 'n8n_chat', credentialId: '' }],
		};
		published.skills['shared-skill'].instructions = 'Published skill';
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
			schema: draft.config,
			skills: draft.skills,
			tools: draft.tools,
			availableInMCP: draft.availableInMCP,
			integrations: [{ type: 'slack', credentialId: 'current-slack' }],
			versionId: `${draft.id}_draft`,
			activeVersionId: null,
			revision: 0,
		});
		await taskRepository.save(
			Object.entries(draft.tasks).map(([id, task]) => ({ id, agentId: agent.id, ...task })),
		);
		const history = await historyRepository.saveVersion({
			versionId: `${agent.id}_published`,
			agentId: agent.id,
			schema: published.config,
			skills: published.skills,
			tools: published.tools,
			publishedBy: 'Package test',
		});
		await taskSnapshotRepository.saveForVersion(
			Object.entries(published.tasks).map(([taskId, task]) => ({
				versionId: history.versionId,
				taskId,
				enabled: false,
				...task,
			})),
		);
		await agentRepository.setActiveVersionFenced(agent.id, agent.revision, {
			activeVersionId: history.versionId,
			versionId: agent.versionId!,
		});
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
		for (const { agent } of sources) {
			const snapshot = (await exporter.prepare(agent, policy))!;
			expect(snapshot.projectId).toBe(project.id);
			const entry = await exporter.write(snapshot, archive, prefix);
			expect(await exporter.write(snapshot, loose, prefix)).toEqual(entry);
			entries.push(entry);
		}
		const manifest: PackageManifest = {
			...looseAgentsFixture().manifest,
			agents: entries,
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
		expect(await readSourceRecords()).toEqual(before);
	},
);

it('rejects a stale draft through the definition service', async () => {
	const agent = sources[0].agent;
	await expect(exporter.prepare({ ...agent, revision: agent.revision - 1 })).rejects.toThrow(
		ConflictError,
	);
});
