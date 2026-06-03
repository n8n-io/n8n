import { z } from 'zod';

import type * as AgentRuntimeModule from '../../runtime/agent-runtime';
import type { DelegateSubAgentRequest } from '../../runtime/delegate-sub-agent-tool';
import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	INLINE_SUB_AGENT_ID,
} from '../../runtime/delegate-sub-agent-tool';
import { RECALL_MEMORY_TOOL_NAME } from '../../runtime/episodic-memory';
import { WRITE_TODOS_TOOL_NAME } from '../../runtime/write-todos-tool';
import type { BuiltTool } from '../../types';
import { Agent, buildInlineSubAgentBlockedToolNames, filterInlineSubAgentTools } from '../agent';

const runtimeConfigs: Array<Record<string, unknown>> = [];

vi.mock('../../runtime/agent-runtime', async (importOriginal) => {
	const actual = await importOriginal<typeof AgentRuntimeModule>();
	return {
		...actual,
		AgentRuntime: class MockAgentRuntime {
			constructor(config: Record<string, unknown>) {
				runtimeConfigs.push(config);
			}

			async generate() {
				return await Promise.resolve({
					runId: 'child-run',
					finishReason: 'stop',
					messages: [
						{
							role: 'assistant',
							type: 'llm',
							content: [{ type: 'text', text: 'done' }],
						},
					],
					usage: {},
				});
			}

			async dispose() {
				return await Promise.resolve();
			}
		},
	};
});

function makeTool(name: string): BuiltTool {
	return {
		name,
		description: `${name} tool`,
		inputSchema: z.object({}),
		handler: async () => await Promise.resolve({ ok: true }),
	};
}

describe('inline sub-agent tool filtering', () => {
	beforeEach(() => {
		runtimeConfigs.length = 0;
	});

	it('blocks SDK-owned tools by default but not other tool names', () => {
		const tools = [
			makeTool(DELEGATE_SUB_AGENT_TOOL_NAME),
			makeTool(RECALL_MEMORY_TOOL_NAME),
			makeTool(WRITE_TODOS_TOOL_NAME),
			makeTool('host_tool'),
			makeTool('lookup'),
		];

		expect(filterInlineSubAgentTools(tools, undefined).map((tool) => tool.name)).toEqual([
			'host_tool',
			'lookup',
		]);
	});

	it('blocks host-supplied tool names when configured', () => {
		const tools = [makeTool('host_tool'), makeTool('lookup')];

		expect(
			filterInlineSubAgentTools(tools, undefined, ['host_tool']).map((tool) => tool.name),
		).toEqual(['lookup']);
	});

	it('does not re-add blocked tools through allowedTools', () => {
		const tools = [makeTool(WRITE_TODOS_TOOL_NAME), makeTool('host_tool'), makeTool('lookup')];

		expect(
			filterInlineSubAgentTools(
				tools,
				[WRITE_TODOS_TOOL_NAME, 'host_tool', 'lookup'],
				['host_tool'],
			).map((tool) => tool.name),
		).toEqual(['lookup']);
	});

	it('merges SDK defaults with host blocked tool names', () => {
		const blocked = buildInlineSubAgentBlockedToolNames(['host_tool']);

		expect(blocked.has(DELEGATE_SUB_AGENT_TOOL_NAME)).toBe(true);
		expect(blocked.has(RECALL_MEMORY_TOOL_NAME)).toBe(true);
		expect(blocked.has(WRITE_TODOS_TOOL_NAME)).toBe(true);
		expect(blocked.has('host_tool')).toBe(true);
		expect(blocked.has('lookup')).toBe(false);
	});

	it('does not pass provider tools to inline child runtimes', async () => {
		const agent = new Agent('parent');
		type AgentWithInlineRunner = {
			createInlineSubAgentRunner: (options: {
				deferredTools: BuiltTool[];
				modelConfig: string;
				tools: BuiltTool[];
				inlineSubAgentBlockedTools?: string[];
			}) => (request: DelegateSubAgentRequest) => Promise<unknown>;
		};

		const runner = (agent as unknown as AgentWithInlineRunner).createInlineSubAgentRunner({
			deferredTools: [],
			modelConfig: 'openai/gpt-4o-mini',
			tools: [makeTool('lookup')],
		});

		await runner({
			subAgentId: INLINE_SUB_AGENT_ID,
			taskName: 'research',
			goal: 'Find the answer',
			taskPath: '/root/research',
			childCount: 0,
		});

		expect(runtimeConfigs).toHaveLength(1);
		expect(runtimeConfigs[0]).not.toHaveProperty('providerTools');
		expect((runtimeConfigs[0]?.tools as BuiltTool[] | undefined)?.map((tool) => tool.name)).toEqual(
			['lookup'],
		);
	});
});
