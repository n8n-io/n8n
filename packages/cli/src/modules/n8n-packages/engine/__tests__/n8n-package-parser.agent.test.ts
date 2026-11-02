import type { Logger } from '@n8n/backend-common';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';

import {
	looseAgentsFixture,
	projectAgentsFixture,
	writeAgentPackageFixture,
	type AgentPackageFixture,
} from '../../__tests__/fixtures/agent-package-fixtures';
import { streamToBuffer } from '../../__tests__/utils/tar-support';
import type { WorkflowSerializer } from '../../entities/workflow/workflow.serializer';
import { DirectoryPackageReader } from '../../io/directory/directory-package-reader';
import { DirectoryPackageWriter } from '../../io/directory/directory-package-writer';
import type { PackageReader } from '../../io/package-reader';
import { TarPackageReader } from '../../io/tar/tar-package-reader';
import { TarPackageWriter } from '../../io/tar/tar-package-writer';
import { PackageImportConfig } from '../../n8n-packages.config';
import type { SerializedAgent } from '../../spec/serialized/agent.schema';
import type { SerializedSkill } from '../../spec/serialized/skill.schema';
import { N8nPackageParser } from '../n8n-package-parser';

const parser = new N8nPackageParser(mock<Logger>(), mock<NodeTypes>(), mock<WorkflowSerializer>());
const limits = new PackageImportConfig();
const agentTarget = 'agents/support';
const agentPath = `${agentTarget}/agent.json`;

function memoryReader(fixture: AgentPackageFixture): PackageReader {
	return {
		readManifest: async () => fixture.manifest,
		readFile: async (filePath) => {
			if (!(filePath in fixture.files)) throw new Error(`Missing ${filePath}`);
			const content = fixture.files[filePath];
			return Buffer.from(typeof content === 'string' ? content : JSON.stringify(content));
		},
		listEntries: async () => Object.keys(fixture.files),
	};
}

describe('N8nPackageParser.getAgents', () => {
	let fixture: AgentPackageFixture;
	let agent: SerializedAgent;
	let directory: string | undefined;

	beforeEach(() => {
		fixture = looseAgentsFixture();
		agent = fixture.files[agentPath] as SerializedAgent;
		directory = undefined;
	});

	afterEach(async () => {
		if (directory) await rm(directory, { recursive: true, force: true });
	});

	async function readers(input: AgentPackageFixture): Promise<PackageReader[]> {
		directory = await mkdtemp(path.join(tmpdir(), 'n8n-agent-package-'));
		const tarWriter = new TarPackageWriter();
		await writeAgentPackageFixture(tarWriter, input);
		await writeAgentPackageFixture(new DirectoryPackageWriter(directory), input);
		const directoryReader = new DirectoryPackageReader(directory, limits);
		await directoryReader.listEntries();
		return [
			new TarPackageReader(await streamToBuffer(tarWriter.finalize()), limits),
			directoryReader,
		];
	}

	it.each([
		{ name: 'loose Agents', fixture: looseAgentsFixture, prefix: '' },
		{ name: 'whole project', fixture: projectAgentsFixture, prefix: 'projects/operations/' },
	])('parses equivalent complete definitions from $name in both readers', async (testCase) => {
		const input = testCase.fixture();
		const [archiveReader, directoryReader] = await readers(input);
		const archived = await parser.getAgents(archiveReader, testCase.prefix);
		const loose = await parser.getAgents(directoryReader, testCase.prefix);

		expect(archived).toEqual(loose);
		expect(archived.map(({ sourceAgentId }) => sourceAgentId)).toEqual([
			'support_source',
			'research_source',
		]);
		expect(archived.map(({ availableInMCP }) => availableInMCP)).toEqual([true, false]);
		for (const [index, parsed] of archived.entries()) {
			const target = input.manifest.agents[index].target;
			const expected = input.files[`${target}/agent.json`] as SerializedAgent;
			expect(parsed.config).toMatchObject({
				model: '',
				skills: [{ id: `${expected.id}_skill` }],
				tools: [{ id: 'shared_tool', enabled: false, requireApproval: true }],
				tasks: [{ id: `${parsed.sourceAgentId}_task`, enabled: false }],
				mcpServers: [{ name: 'Reference', url: '' }],
			});
			expect(parsed.metadata).toEqual({
				versionId: 'draft-version',
				publishedVersionId: 'published-version',
			});
			expect(parsed.tools).toEqual(expected.tools);
			expect(parsed.tasks).toEqual({
				[`${parsed.sourceAgentId}_task`]: {
					name: 'Daily summary',
					objective: 'Summarize the open requests.',
					cronExpression: '0 9 * * *',
					timezone: null,
				},
			});
		}
	});

	it('scopes Agents by the requested package prefix', async () => {
		const input = projectAgentsFixture();
		delete input.manifest.projects;
		input.manifest.agents[1] = fixture.manifest.agents[1];
		Object.assign(input.files, fixture.files);

		for (const reader of await readers(input)) {
			expect((await parser.getAgents(reader)).map(({ sourceAgentId }) => sourceAgentId)).toEqual([
				'research_source',
			]);
			expect(
				(await parser.getAgents(reader, 'projects/operations/')).map(
					({ sourceAgentId }) => sourceAgentId,
				),
			).toEqual(['support_source']);
		}
	});

	it('validates manifest targets before reading Agent files in both readers', async () => {
		fixture.manifest.agents[0].target = 'agents/../other/entry';
		for (const fileName of ['agent.json', 'agent-metadata.json']) {
			fixture.files[`other/entry/${fileName}`] = fixture.files[`${agentTarget}/${fileName}`];
		}

		for (const reader of await readers(fixture)) {
			await expect(parser.getAgents(reader)).rejects.toThrow('Package manifest failed validation');
		}
	});

	it('accepts null draft configuration and version metadata with inline bodies', async () => {
		agent.config = null;
		fixture.files[`${agentTarget}/agent-metadata.json`] = {
			versionId: null,
			publishedVersionId: null,
		};

		const [parsed] = await parser.getAgents(memoryReader(fixture));
		expect(parsed).toMatchObject({
			config: null,
			availableInMCP: true,
			metadata: { versionId: null, publishedVersionId: null },
			tools: agent.tools,
		});
	});

	it.each(['agent.json', 'agent-metadata.json'])('rejects a missing %s file', async (fileName) => {
		const filePath = `${agentTarget}/${fileName}`;
		delete fixture.files[filePath];
		await expect(parser.getAgents(memoryReader(fixture))).rejects.toThrow(
			`missing Agent file at ${filePath}`,
		);
	});

	it('identifies invalid JSON by file', async () => {
		fixture.files[agentPath] = '{';
		await expect(parser.getAgents(memoryReader(fixture))).rejects.toThrow(
			`${agentPath} is not valid JSON`,
		);
	});

	it.each([
		['agent.json', { availableInMCP: undefined }],
		[
			'agent.json',
			{ config: { name: 'Draft', model: '', credential: 'cred-1', instructions: '' } },
		],
		['agent-metadata.json', { versionId: undefined }],
	])('rejects malformed %s: %j', async (fileName, fields) => {
		const filePath = `${agentTarget}/${fileName}`;
		fixture.files[filePath] = { ...(fixture.files[filePath] as object), ...fields };
		await expect(parser.getAgents(memoryReader(fixture))).rejects.toThrow(
			`${filePath} failed schema validation`,
		);
	});

	it.each([
		['tools', 'shared_tool', { code: 42 }],
		['tools', 'shared_tool', { descriptor: { name: 'Incomplete' } }],
		['tasks', 'support_source_task', { timezone: 'Invalid/Zone' }],
		['tasks', 'support_source_task', { objective: '' }],
	] as const)('rejects malformed inline %s: %j', async (collection, id, fields) => {
		fixture.files[agentPath] = {
			...agent,
			[collection]: { ...agent[collection], [id]: { ...agent[collection][id], ...fields } },
		};
		await expect(parser.getAgents(memoryReader(fixture))).rejects.toThrow(
			`${agentPath} failed schema validation`,
		);
	});

	it.each([
		['tools', 'invalid-id'],
		['tasks', 'x'.repeat(33)],
	] as const)('validates inline %s body IDs: %s', async (collection, id) => {
		fixture.files[agentPath] = {
			...agent,
			[collection]: { [id]: Object.values(agent[collection])[0] },
		};
		await expect(parser.getAgents(memoryReader(fixture))).rejects.toThrow(
			`${agentPath} failed schema validation`,
		);
	});

	it('rejects skill bodies inside agent.json', async () => {
		fixture.files[agentPath] = { ...agent, skills: {} };
		await expect(parser.getAgents(memoryReader(fixture))).rejects.toThrow(
			`${agentPath} failed schema validation`,
		);
	});

	it.each(['agent.json', 'agent-metadata.json'])(
		'rejects runtime fields in %s',
		async (fileName) => {
			const filePath = `${agentTarget}/${fileName}`;
			fixture.files[filePath] = { ...(fixture.files[filePath] as object), createdAt: '2026-10-01' };
			await expect(parser.getAgents(memoryReader(fixture))).rejects.toThrow(
				`${filePath} failed schema validation`,
			);
		},
	);

	it.each(['tools', 'tasks'] as const)(
		'rejects runtime fields in inline %s bodies',
		async (collection) => {
			const [id, body] = Object.entries(agent[collection])[0];
			fixture.files[agentPath] = {
				...agent,
				[collection]: { [id]: { ...body, createdAt: '2026-10-01' } },
			};
			await expect(parser.getAgents(memoryReader(fixture))).rejects.toThrow(
				`${agentPath} failed schema validation`,
			);
		},
	);

	it.each([
		['inputSchema', []],
		['outputSchema', false],
		['systemInstruction', 42],
		['hasSuspend', 'true'],
		['outputTrust', 'trusted'],
		['providerOptions', []],
		['runtimeState', {}],
	])('validates the inline tool descriptor field %s', async (field, value) => {
		const tool = agent.tools.shared_tool;
		fixture.files[agentPath] = {
			...agent,
			tools: { shared_tool: { ...tool, descriptor: { ...tool.descriptor, [field]: value } } },
		};
		await expect(parser.getAgents(memoryReader(fixture))).rejects.toThrow(
			`${agentPath} failed schema validation`,
		);
	});

	it('rejects an Agent ID that does not match the manifest', async () => {
		agent.id = 'different_id';
		await expect(parser.getAgents(memoryReader(fixture))).rejects.toThrow(
			`${agentPath} declares id "different_id"`,
		);
	});

	it.each(['tools', 'tasks'] as const)('requires a body for disabled %s', async (collection) => {
		const missingId = Object.keys(agent[collection])[0];
		agent[collection] = {};
		await expect(parser.getAgents(memoryReader(fixture))).rejects.toMatchObject({
			meta: {
				issues: [
					{
						type: 'agent-invalid',
						sourceAgentId: agent.id,
						path: `${agentPath}#${collection}.${missingId}`,
					},
				],
			},
		});
	});

	it('validates inline bodies that have no configuration reference', async () => {
		agent.config = null;
		fixture.files[agentPath] = { ...agent, skills: { support_source_skill: {} } };
		await expect(parser.getAgents(memoryReader(fixture))).rejects.toThrow(
			`${agentPath} failed schema validation`,
		);
	});

	it.each(['not a cron', '0 9 30 2 *'])(
		'uses the task cron validator for %s',
		async (cronExpression) => {
			agent.tasks.support_source_task.cronExpression = cronExpression;
			await expect(parser.getAgents(memoryReader(fixture))).rejects.toThrow(
				'Agent "support_source" task "support_source_task" has an invalid cron expression',
			);
		},
	);
});

describe('N8nPackageParser.getSkills', () => {
	const skillPath = 'skills/support_source_skill/skill.json';
	let fixture: AgentPackageFixture;

	beforeEach(() => {
		fixture = looseAgentsFixture();
	});

	it('reads every skill with its scope and frontmatter', async () => {
		const skills = await parser.getSkills(memoryReader(fixture));
		expect(skills.map(({ id }) => id)).toEqual(['support_source_skill', 'research_source_skill']);
		expect(skills[0]).toMatchObject({
			scope: 'project',
			skill: { name: 'Support reference' },
			frontmatter: { license: 'MIT' },
		});
	});

	it.each([
		['an ID that differs from the manifest', { id: 'other_skill' }, 'declares id'],
		['the scope of one Agent', { scope: 'agent' }, 'failed schema validation'],
		['a skill that names an Agent', { agentId: 'support_source' }, 'failed schema validation'],
		['n8n Assistant availability', { availableToAssistant: true }, 'failed schema validation'],
	])('rejects %s', async (_case, fields, message) => {
		fixture.files[skillPath] = { ...(fixture.files[skillPath] as object), ...fields };
		await expect(parser.getSkills(memoryReader(fixture))).rejects.toThrow(message);
	});

	it.each([
		['a non-text instruction', { instructions: 42 }],
		['instructions without text', { instructions: '   ' }],
		['a reference outside the skill', { references: [{ path: '../guide.md', content: 'Guide' }] }],
		['allowed tools', { allowedTools: ['lookup'] }],
		['a runtime field', { createdAt: '2026-10-01' }],
	])('rejects a skill body with %s', async (_case, fields) => {
		const file = fixture.files[skillPath] as SerializedSkill;
		fixture.files[skillPath] = { ...file, skill: { ...file.skill, ...fields } };
		await expect(parser.getSkills(memoryReader(fixture))).rejects.toThrow(
			`${skillPath} failed schema validation`,
		);
	});

	it('rejects an invalid skill ID', async () => {
		fixture.manifest.skills[0].id = 'invalid id';
		fixture.files[skillPath] = { ...(fixture.files[skillPath] as object), id: 'invalid id' };
		await expect(parser.getSkills(memoryReader(fixture))).rejects.toThrow(
			`${skillPath} failed schema validation`,
		);
	});
});
