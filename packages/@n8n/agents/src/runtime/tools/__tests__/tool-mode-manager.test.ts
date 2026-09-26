import type { LanguageModel } from 'ai';

import { Agent } from '../../../sdk/agent';
import type { BuiltTool } from '../../../types';
import type { AgentDbMessage } from '../../../types/sdk/message';
import type { ToolModesConfig } from '../../../types/sdk/tool-modes';
import type { AgentRuntimeConfig } from '../../loop/agent-runtime';
import { RuntimeContextBuilder } from '../../loop/runtime-context';
import { SWITCH_MODE_TOOL_NAME, ToolModeManager } from '../tool-mode-manager';

const fakeModel = { doGenerate: vi.fn() } as unknown as LanguageModel;

const config: ToolModesConfig = {
	modes: {
		build: { description: 'Build workflows.', tools: ['build-workflow', 'nodes'] },
		debug: { description: 'Debug executions.', tools: ['executions', 'nodes'] },
		general: { description: 'Answer questions.', tools: [] },
	},
	initialMode: 'build',
};

function makeTool(name: string): BuiltTool {
	return {
		name,
		description: `${name} tool`,
		inputSchema: { type: 'object' },
		handler: async () => await Promise.resolve({ ok: true }),
	};
}

function switchCall(output: unknown, state = 'resolved'): AgentDbMessage {
	return {
		id: `m-${Math.random()}`,
		createdAt: new Date(0),
		role: 'assistant',
		content: [
			{
				type: 'tool-call',
				toolCallId: 'call-1',
				toolName: SWITCH_MODE_TOOL_NAME,
				input: {},
				state,
				output,
			},
		],
	} as unknown as AgentDbMessage;
}

async function buildAgentConfig(agent: Agent): Promise<AgentRuntimeConfig> {
	return await (agent as unknown as { build(): Promise<AgentRuntimeConfig> }).build();
}

describe('ToolModeManager', () => {
	it('shows unscoped tools and the tools of the current mode only', () => {
		const manager = new ToolModeManager(config);

		expect(manager.isVisible('ask-user')).toBe(true);
		expect(manager.isVisible('build-workflow')).toBe(true);
		expect(manager.isVisible('nodes')).toBe(true);
		expect(manager.isVisible('executions')).toBe(false);
	});

	it('changes the visible tools when the model switches mode', async () => {
		const manager = new ToolModeManager(config);

		const output = await manager.getControllerTool().handler?.({ mode: 'debug' }, {} as never);

		expect(output).toMatchObject({ status: 'switched', mode: 'debug' });
		expect(manager.isVisible('executions')).toBe(true);
		expect(manager.isVisible('nodes')).toBe(true);
		expect(manager.isVisible('build-workflow')).toBe(false);
	});

	it('reports unchanged when the model switches to the current mode', () => {
		const manager = new ToolModeManager(config);

		expect(manager.switchTo('build')).toMatchObject({ status: 'unchanged', mode: 'build' });
	});

	it('rejects a mode that is not configured', async () => {
		const manager = new ToolModeManager(config);

		await expect(
			manager.getControllerTool().handler?.({ mode: 'unknown' }, {} as never),
		).rejects.toThrow();
		expect(manager.mode).toBe('build');
	});

	it('lists each mode and its tools in the switch tool description', () => {
		const { description } = new ToolModeManager(config).getControllerTool();

		expect(description).toContain('- debug: Debug executions. Tools: executions, nodes.');
		expect(description).toContain('- general: Answer questions. Tools: no extra tools.');
	});

	it('restores the last resolved switch from the messages', () => {
		const manager = new ToolModeManager(config);
		manager.switchTo('general');

		manager.hydrateFromMessages([
			switchCall({ status: 'switched', mode: 'debug' }),
			switchCall({ status: 'switched', mode: 'general' }, 'pending'),
			switchCall({ status: 'unchanged', mode: 'build' }),
		]);

		expect(manager.mode).toBe('debug');
	});

	it('returns to the initial mode when the messages hold no switch', () => {
		const manager = new ToolModeManager(config);
		manager.switchTo('debug');

		manager.hydrateFromMessages([]);

		expect(manager.mode).toBe('build');
	});

	it('rejects an initial mode that is not configured', () => {
		expect(() => new ToolModeManager({ ...config, initialMode: 'missing' })).toThrow(
			'Initial tool mode "missing" is not a configured mode',
		);
	});
});

describe('RuntimeContextBuilder with tool modes', () => {
	function makeBuilder() {
		const manager = new ToolModeManager(config);
		const builder = new RuntimeContextBuilder(
			{
				name: 'agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Test agent.',
				tools: ['ask-user', 'build-workflow', 'nodes', 'executions'].map(makeTool),
			},
			undefined,
			manager,
		);
		return { manager, builder };
	}

	it('binds the current mode tools, unscoped tools, and switch_mode', () => {
		const { manager, builder } = makeBuilder();

		expect(builder.getCurrentTools().map((tool) => tool.name)).toEqual([
			'ask-user',
			'build-workflow',
			'nodes',
			SWITCH_MODE_TOOL_NAME,
		]);

		manager.switchTo('debug');

		expect(builder.getCurrentTools().map((tool) => tool.name)).toEqual([
			'ask-user',
			'nodes',
			'executions',
			SWITCH_MODE_TOOL_NAME,
		]);
	});

	it('tells the discovery tools to pick the mode first, in every mode', () => {
		const manager = new ToolModeManager(config);
		const builder = new RuntimeContextBuilder(
			{
				name: 'agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Test agent.',
				tools: ['load_skill', 'nodes'].map(makeTool),
			},
			undefined,
			manager,
		);
		const descriptions = () =>
			Object.fromEntries(builder.getCurrentTools().map((tool) => [tool.name, tool.description]));

		const inBuild = descriptions();
		manager.switchTo('debug');
		const inDebug = descriptions();

		expect(inBuild.load_skill).toMatch(/^load_skill tool Call switch_mode/);
		expect(inBuild.nodes).toBe('nodes tool');
		expect(inDebug.load_skill).toBe(inBuild.load_skill);
	});

	it('leaves discovery tool descriptions unchanged without tool modes', () => {
		const builder = new RuntimeContextBuilder(
			{
				name: 'agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Test agent.',
				tools: [makeTool('load_skill')],
			},
			undefined,
		);

		expect(builder.getCurrentTools()[0].description).toBe('load_skill tool');
	});

	it('names the current mode in the uncached instructions', () => {
		const { manager, builder } = makeBuilder();
		manager.switchTo('debug');

		const { volatileInstructions, effectiveInstructions } = builder.buildToolLoopContext({});

		expect(volatileInstructions).toContain('Your current tool mode is "debug"');
		expect(effectiveInstructions).not.toContain('tool mode');
	});
});

describe('Agent.toolModes validation', () => {
	function makeAgent() {
		return new Agent('agent').model(fakeModel).instructions('Test agent.');
	}

	it('passes the tool modes config to the runtime', async () => {
		const runtimeConfig = await buildAgentConfig(
			makeAgent()
				.tool([makeTool('build-workflow')])
				.toolModes(config),
		);

		expect(runtimeConfig.toolModes).toBe(config);
	});

	it('rejects a static tool named switch_mode', async () => {
		await expect(
			buildAgentConfig(makeAgent().tool(makeTool(SWITCH_MODE_TOOL_NAME)).toolModes(config)),
		).rejects.toThrow(`Tool name "${SWITCH_MODE_TOOL_NAME}" is reserved for tool modes`);
	});

	it('rejects a mode that scopes a deferred tool', async () => {
		await expect(
			buildAgentConfig(makeAgent().deferredTool(makeTool('executions')).toolModes(config)),
		).rejects.toThrow('Tool modes can only scope tools added with .tool(), not deferred tools');
	});
});
