import { AgentJsonConfigSchema } from '@n8n/api-types';
import { ConflictError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';
import { ZodError } from 'zod';

import type { AgentDefinitionService } from '@/modules/agents/agent-definition.service';
import type { AgentHistory } from '@/modules/agents/entities/agent-history.entity';
import { Agent } from '@/modules/agents/entities/agent.entity';
import type { AgentDefinition } from '@/modules/agents/utils/agent-definition';

import { looseAgentsFixture } from '../../../__tests__/fixtures/agent-package-fixtures';
import { CapturingWriter } from '../../../io/__tests__/utils/capturing-writer';
import { HashingPackageWriter } from '../../../io/hashing-package-writer';
import { ExportVersionPolicy } from '../../../n8n-packages.types';
import { serializedAgentSchema } from '../../../spec/serialized/agent.schema';
import { AgentExporter } from '../agent.exporter';
import { AgentSerializer } from '../agent.serializer';

const taskId = 'support_source_task';

function definitionFixture(version: string): AgentDefinition {
	const fixture = serializedAgentSchema.parse(
		looseAgentsFixture().files['agents/support/agent.json'],
	);
	const config = AgentJsonConfigSchema.parse(fixture.config);
	config.instructions = `${version} instructions`;
	fixture.skills['shared-skill'].instructions = `${version} skill`;
	fixture.tools.shared_tool.code = `throw new Error("${version} tool must not run");`;
	fixture.tasks[taskId].objective = `${version} task`;
	return {
		schema: config,
		skills: fixture.skills,
		tools: fixture.tools,
		tasks: new Map(Object.entries(fixture.tasks)),
	};
}

function setup() {
	const draft = definitionFixture('Draft');
	const published = definitionFixture('Published');
	published.schema = {
		...AgentJsonConfigSchema.parse(published.schema),
		integrations: [
			{ type: 'n8n_chat', credentialId: '' },
			{ type: 'slack', credentialId: 'old-slack' },
		],
	};
	const agent: Agent = Object.assign(new Agent(), {
		id: 'support_source',
		name: 'Current name',
		projectId: 'source-project',
		availableInMCP: true,
		versionId: 'draft-version',
		activeVersionId: 'published-version',
		activeVersion: mock<AgentHistory>({ versionId: 'published-version' }),
		integrations: [{ type: 'slack', credentialId: 'current-slack' }],
		schema: draft.schema,
		skills: draft.skills,
		tools: draft.tools,
	});
	const definitions = mock<AgentDefinitionService>();
	definitions.readDraft.mockResolvedValue(draft);
	definitions.readVersion.mockResolvedValue(published);
	return {
		agent,
		draft,
		published,
		definitions,
		exporter: new AgentExporter(definitions, new AgentSerializer()),
	};
}

describe('AgentExporter', () => {
	it.each([
		{ policy: undefined, published: true, selected: 'draft' },
		{ policy: ExportVersionPolicy.Latest, published: false, selected: 'draft' },
		{ policy: ExportVersionPolicy.PublishedStrict, published: true, selected: 'published' },
		{ policy: ExportVersionPolicy.PreferPublished, published: true, selected: 'published' },
		{ policy: ExportVersionPolicy.PreferPublished, published: false, selected: 'draft' },
		{ policy: ExportVersionPolicy.IgnoreUnpublished, published: true, selected: 'published' },
	] as const)(
		'prepares $selected for policy $policy with published=$published',
		async (testCase) => {
			const source = setup();
			if (!testCase.published) source.agent.activeVersionId = null;

			const snapshot = await source.exporter.prepare(source.agent, testCase.policy);
			const selected = source[testCase.selected];
			const integrations = [{ type: 'slack', credentialId: 'current-slack' }];
			if (testCase.selected === 'published')
				integrations.push({ type: 'n8n_chat', credentialId: '' });
			expect(snapshot).toEqual({
				projectId: 'source-project',
				content: {
					id: 'support_source',
					name: 'Current name',
					availableInMCP: true,
					config: { ...selected.schema, integrations },
					skills: selected.skills,
					tools: selected.tools,
					tasks: { [taskId]: selected.tasks.get(taskId) },
				},
				metadata: {
					versionId: `${testCase.selected}-version`,
					publishedVersionId: testCase.published ? 'published-version' : null,
				},
			});
		},
	);

	it('skips an unpublished Agent under ignore-unpublished', async () => {
		const { agent, exporter } = setup();
		agent.activeVersionId = null;
		await expect(
			exporter.prepare(agent, ExportVersionPolicy.IgnoreUnpublished),
		).resolves.toBeUndefined();
	});

	it('rejects an unpublished Agent under published-strict', async () => {
		const { agent, exporter } = setup();
		agent.activeVersionId = null;
		await expect(exporter.prepare(agent, ExportVersionPolicy.PublishedStrict)).rejects.toThrow(
			'Agent "support_source" has no published version',
		);
	});

	it('fails when the selected published snapshot is missing', async () => {
		const { agent, exporter } = setup();
		agent.activeVersion = null;
		await expect(exporter.prepare(agent, ExportVersionPolicy.PreferPublished)).rejects.toThrow(
			'Published version was not loaded for Agent',
		);
	});

	it('propagates draft revision conflicts', async () => {
		const { agent, definitions, exporter } = setup();
		const conflict = new ConflictError('Agent was modified concurrently; please retry');
		definitions.readDraft.mockRejectedValue(conflict);
		await expect(exporter.prepare(agent)).rejects.toBe(conflict);
	});

	it('does not add current Chat settings to a published definition without Chat', async () => {
		const { agent, published, exporter } = setup();
		agent.integrations.push({ type: 'n8n_chat', credentialId: '' });
		published.schema!.integrations = [];
		const snapshot = await exporter.prepare(agent, ExportVersionPolicy.PublishedStrict);
		expect(snapshot?.content.config?.integrations).toEqual([
			{ type: 'slack', credentialId: 'current-slack' },
		]);
	});

	it.each([
		{
			kind: 'skill',
			id: 'shared-skill',
			remove: (definition: AgentDefinition) => {
				definition.skills = {};
			},
		},
		{
			kind: 'custom tool',
			id: 'shared_tool',
			remove: (definition: AgentDefinition) => {
				definition.tools = {};
			},
		},
		{
			kind: 'task',
			id: taskId,
			remove: (definition: AgentDefinition) => {
				definition.tasks = new Map();
			},
		},
	])('requires a body for a disabled $kind reference', async ({ kind, id, remove }) => {
		const { agent, draft, exporter } = setup();
		remove(draft);
		await expect(exporter.prepare(agent)).rejects.toThrow(
			`Agent "support_source" references missing ${kind} "${id}"`,
		);
	});

	it.each([
		{
			kind: 'skill',
			corrupt: (definition: AgentDefinition) =>
				Object.assign(definition.skills['shared-skill'], { instructions: 42 }),
		},
		{
			kind: 'tool descriptor',
			corrupt: (definition: AgentDefinition) =>
				Object.assign(definition.tools.shared_tool.descriptor, { hasResume: 'yes' }),
		},
		{
			kind: 'task',
			corrupt: (definition: AgentDefinition) =>
				Object.assign(definition.tasks.get(taskId)!, { timezone: 'invalid-zone' }),
		},
	])('rejects an invalid $kind before writing', async ({ corrupt }) => {
		const { agent, draft, exporter } = setup();
		corrupt(draft);
		await expect(exporter.prepare(agent)).rejects.toThrow(ZodError);
	});

	it('omits unused bodies and normalizes an omitted timezone', async () => {
		const { agent, draft, exporter } = setup();
		draft.skills.unused = { ...draft.skills['shared-skill'] };
		draft.tools.unused = { ...draft.tools.shared_tool };
		const task = draft.tasks.get(taskId)!;
		delete task.timezone;
		draft.tasks = new Map([
			[taskId, task],
			['unused', { ...task }],
		]);
		const snapshot = await exporter.prepare(agent);
		expect(Object.keys(snapshot!.content.skills)).toEqual(['shared-skill']);
		expect(Object.keys(snapshot!.content.tools)).toEqual(['shared_tool']);
		expect(snapshot?.content.tasks).toEqual({ [taskId]: { ...task, timezone: null } });
	});

	it('exports empty body maps for a null configuration', async () => {
		const { agent, draft, exporter } = setup();
		draft.schema = null;
		expect((await exporter.prepare(agent))?.content).toEqual({
			id: agent.id,
			name: agent.name,
			availableInMCP: true,
			config: null,
			skills: {},
			tools: {},
			tasks: {},
		});
	});

	it('writes the detached snapshot after source changes', async () => {
		const { agent, draft, definitions, exporter } = setup();
		const snapshot = (await exporter.prepare(agent))!;
		const expected = structuredClone(snapshot);
		draft.schema!.instructions = 'Changed after preparation';
		draft.skills['shared-skill'].references![0].content = 'Changed reference';
		Object.assign(draft.tools.shared_tool.descriptor.inputSchema!, { properties: {} });
		Object.assign(draft.tools.shared_tool.descriptor.providerOptions!, {
			provider: { cache: true },
		});
		draft.tasks.get(taskId)!.objective = 'Changed task';
		agent.integrations[0].credentialId = 'changed-credential';
		agent.name = 'Changed name';
		definitions.readDraft.mockRejectedValue(new Error('Do not reload the definition'));
		const writer = new CapturingWriter();
		const entry = await exporter.write(snapshot, writer);

		expect(snapshot).toEqual(expected);
		expect(entry).toEqual({
			id: 'support_source',
			name: 'Current name',
			target: 'agents/current-name-support_source',
		});
		expect(writer.files).toHaveLength(2);
		expect(JSON.parse(writer.files[0].content)).toEqual(expected.content);
		expect(JSON.parse(writer.files[1].content)).toEqual(expected.metadata);
	});

	it('keeps authored bytes and hashes stable when only publication metadata changes', async () => {
		const { agent, exporter } = setup();
		const before = (await exporter.prepare(agent))!;
		agent.versionId = 'new-draft-version';
		agent.activeVersionId = null;
		const after = (await exporter.prepare(agent))!;
		const captures = [new CapturingWriter(), new CapturingWriter()];
		const hashes = [new HashingPackageWriter(), new HashingPackageWriter()];
		for (const [index, snapshot] of [before, after].entries()) {
			await exporter.write(snapshot, captures[index]);
			await exporter.write(snapshot, hashes[index]);
		}
		expect(captures[0].files[0]).toEqual(captures[1].files[0]);
		expect(hashes[0].finalize()[0]).toEqual(hashes[1].finalize()[0]);
		expect(captures[0].files[1]).not.toEqual(captures[1].files[1]);
		expect(hashes[0].finalize()[1]).not.toEqual(hashes[1].finalize()[1]);
	});
});
