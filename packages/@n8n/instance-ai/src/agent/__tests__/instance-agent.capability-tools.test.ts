/* eslint-disable import-x/order */
import type { Mock } from 'vitest';

const mockAgentInstances: Array<{ tool: Mock; deferredTool: Mock }> = [];

vi.mock('@n8n/agents', () => ({
	Agent: vi.fn().mockImplementation(function Agent(this: Record<string, Mock>) {
		for (const method of [
			'model',
			'instructions',
			'tool',
			'deferredTool',
			'skills',
			'checkpoint',
			'memory',
			'telemetry',
			'workspace',
			'thinking',
			'mcpConnectionFailures',
		]) {
			this[method] = vi.fn().mockReturnThis();
		}
		mockAgentInstances.push({ tool: this.tool, deferredTool: this.deferredTool });
	}),
	Memory: vi.fn(),
}));

const mockBuiltTool = (name: string, marker?: string) => ({
	name,
	description: name,
	handler: vi.fn(),
	marker,
});

vi.mock('../../tools', () => ({
	getActiveOrchestratorDomainToolNames: vi.fn(
		() => new Set(['workflows', 'research', 'nodes', 'build-workflow']),
	),
	createOrchestratorDomainTools: vi.fn(
		() =>
			new Map([
				['workflows', mockBuiltTool('workflows', 'native-workflows')],
				['research', mockBuiltTool('research', 'native-research')],
				['nodes', mockBuiltTool('nodes', 'native-nodes')],
				['build-workflow', mockBuiltTool('build-workflow', 'native-build-workflow')],
			]),
	),
	createOrchestrationTools: vi.fn(
		() => new Map([['create-tasks', mockBuiltTool('create-tasks', 'native-create-tasks')]]),
	),
}));

vi.mock('../../tools/filesystem/create-tools-from-mcp-server', () => ({
	createToolsFromLocalMcpServer: vi.fn().mockReturnValue(new Map()),
}));

vi.mock('../../tracing/langsmith-tracing', () => ({
	buildAgentTraceInputs: vi.fn().mockReturnValue({}),
	mergeTraceRunInputs: vi.fn(),
	setTracePromptVersion: vi.fn(),
	setTraceModelId: vi.fn(),
	modelIdTraceMetadata: () => ({}),
}));

vi.mock('../system-prompt', () => ({
	getSystemPrompt: vi.fn().mockReturnValue('system prompt'),
	createSystemPromptRenderer: vi.fn(() => vi.fn().mockReturnValue('system prompt')),
}));

import { createToolsFromLocalMcpServer as createToolsFromLocalMcpServerImport } from '../../tools/filesystem/create-tools-from-mcp-server';
import type { InstanceAiCapabilityTool } from '../../types';
import { createInstanceAgent } from '../instance-agent';

const createToolsFromLocalMcpServer = createToolsFromLocalMcpServerImport as unknown as Mock;

type MockTool = ReturnType<typeof mockBuiltTool>;

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

const capability = (name: string, alwaysLoaded = false): InstanceAiCapabilityTool => ({
	tool: mockBuiltTool(name, `capability-${name}`) as never,
	alwaysLoaded,
});

const toolsByName = (mock: Mock | undefined): Record<string, MockTool> => {
	const tools = (mock?.mock.calls[0]?.[0] ?? []) as MockTool[];
	return Object.fromEntries(tools.map((tool) => [tool.name, tool]));
};

const coreTools = () => toolsByName(mockAgentInstances[0]?.tool);
const deferredTools = () => toolsByName(mockAgentInstances[0]?.deferredTool);
const allTools = () => ({ ...coreTools(), ...deferredTools() });

async function createAgent(options: {
	capabilityTools?: InstanceAiCapabilityTool[];
	externalMcpTools?: Map<string, MockTool>;
	orchestrationContext?: Record<string, unknown>;
	localMcpServer?: unknown;
	disableDeferredTools?: boolean;
}) {
	await createInstanceAgent({
		modelId: 'test-model',
		context: { logger, localMcpServer: options.localMcpServer },
		orchestrationContext: options.orchestrationContext ?? { runId: 'run-1' },
		memoryConfig: {},
		mcpManager: {
			getRegularTools: vi.fn().mockResolvedValue({
				tools: options.externalMcpTools ?? new Map(),
				connectionFailures: [],
			}),
		},
		capabilityTools: options.capabilityTools,
		disableDeferredTools: options.disableDeferredTools,
	} as never);
}

describe('createInstanceAgent with capability tools', () => {
	beforeEach(() => {
		mockAgentInstances.length = 0;
		logger.warn.mockClear();
		createToolsFromLocalMcpServer.mockReset().mockReturnValue(new Map());
	});

	it('offers a capability as a deferred tool of the agent by default', async () => {
		await createAgent({ capabilityTools: [capability('parse_schedule')] });

		expect(deferredTools().parse_schedule).toMatchObject({ marker: 'capability-parse_schedule' });
		expect(coreTools().parse_schedule).toBeUndefined();
	});

	it('keeps an always-loaded capability in the core tool set', async () => {
		await createAgent({
			capabilityTools: [capability('parse_schedule', true), capability('list_things')],
		});

		expect(coreTools().parse_schedule).toMatchObject({ marker: 'capability-parse_schedule' });
		expect(deferredTools().parse_schedule).toBeUndefined();
		expect(deferredTools().list_things).toMatchObject({ marker: 'capability-list_things' });
	});

	it('attaches every capability directly when deferred tools are off', async () => {
		await createAgent({
			capabilityTools: [capability('parse_schedule')],
			disableDeferredTools: true,
		});

		expect(coreTools().parse_schedule).toMatchObject({ marker: 'capability-parse_schedule' });
		expect(mockAgentInstances[0]?.deferredTool).not.toHaveBeenCalled();
	});

	it.each([
		['workflows', 'workflows'],
		['build_workflow', 'build-workflow'],
		['create_tasks', 'create-tasks'],
	])('skips the capability %s that has the name of %s and warns', async (name, nativeName) => {
		await createAgent({ capabilityTools: [capability(name), capability('parse_schedule')] });

		const tools = allTools();
		expect(Object.values(tools).map((tool) => tool.marker)).not.toContain(`capability-${name}`);
		expect(tools[nativeName]).toMatchObject({ marker: `native-${nativeName}` });
		expect(tools.parse_schedule).toMatchObject({ marker: 'capability-parse_schedule' });
		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(
			'Skipped capability tool with the name of another tool',
			{ toolName: name, conflictsWith: nativeName },
		);
	});

	it('keeps the first of two capabilities with the same name', async () => {
		await createAgent({
			capabilityTools: [
				capability('parse_schedule'),
				{ tool: mockBuiltTool('parse_schedule', 'second') as never, alwaysLoaded: true },
			],
		});

		expect(allTools().parse_schedule).toMatchObject({ marker: 'capability-parse_schedule' });
		expect(coreTools().parse_schedule).toBeUndefined();
		expect(logger.warn).toHaveBeenCalledTimes(1);
	});

	it('rejects an external MCP tool with the name of a capability', async () => {
		const orchestrationContext: Record<string, unknown> = { runId: 'run-1' };

		await createAgent({
			capabilityTools: [capability('parse_schedule')],
			externalMcpTools: new Map([
				['parse_schedule', mockBuiltTool('parse_schedule', 'external')],
				['notion_search', mockBuiltTool('notion_search', 'external-search')],
			]),
			orchestrationContext,
		});

		expect(allTools().parse_schedule).toMatchObject({ marker: 'capability-parse_schedule' });
		expect(allTools().notion_search).toMatchObject({ marker: 'external-search' });
		// The builder sub-agents get the safe MCP tools only, never the rejected one.
		expect(orchestrationContext.mcpTools).toEqual(
			new Map([['notion_search', expect.objectContaining({ marker: 'external-search' })]]),
		);
		expect(logger.warn).toHaveBeenCalledWith(
			'Skipped MCP tool with unsafe name',
			expect.objectContaining({ toolName: 'parse_schedule', source: 'external MCP' }),
		);
	});

	it('rejects a local gateway MCP tool whose normalised name matches a capability', async () => {
		createToolsFromLocalMcpServer.mockReturnValue(
			new Map([['Parse-Schedule', mockBuiltTool('Parse-Schedule', 'local')]]),
		);

		await createAgent({
			capabilityTools: [capability('parse_schedule')],
			localMcpServer: { getToolsByCategory: vi.fn().mockReturnValue([]) },
		});

		expect(allTools()['Parse-Schedule']).toBeUndefined();
		expect(allTools().parse_schedule).toMatchObject({ marker: 'capability-parse_schedule' });
	});

	it('removes a capability that the prompt profile disables', async () => {
		await createAgent({
			capabilityTools: [capability('parse_schedule', true), capability('list_things')],
			orchestrationContext: {
				runId: 'run-1',
				disabledToolNames: new Set(['parse_schedule']),
			},
		});

		expect(allTools().parse_schedule).toBeUndefined();
		expect(allTools().list_things).toMatchObject({ marker: 'capability-list_things' });
	});

	it('keeps the native tool set unchanged without capability tools', async () => {
		await createAgent({});
		const withoutOption = Object.keys(allTools()).sort();
		mockAgentInstances.length = 0;

		await createAgent({ capabilityTools: [] });

		expect(Object.keys(allTools()).sort()).toEqual(withoutOption);
		expect(withoutOption).toEqual([
			'build-workflow',
			'create-tasks',
			'nodes',
			'research',
			'workflows',
		]);
		expect(logger.warn).not.toHaveBeenCalled();
	});
});
