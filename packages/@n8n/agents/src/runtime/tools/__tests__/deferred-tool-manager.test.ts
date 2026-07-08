import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { DeferredToolManager, LOAD_TOOLS_TOOL_NAME } from '../deferred-tool-manager';
import type { BuiltTool } from '../../../types/sdk/tool';

function makeTool(name: string): BuiltTool {
	return {
		name,
		description: `Tool ${name}`,
		inputSchema: z.object({}),
		handler: async () => await Promise.resolve({ ok: true }),
	};
}

describe('DeferredToolManager', () => {
	it('exposes search_tools and load_tools controller tools', () => {
		const manager = new DeferredToolManager([makeTool('workflows')]);
		const names = manager.getControllerTools().map((tool) => tool.name);
		expect(names).toEqual(['search_tools', LOAD_TOOLS_TOOL_NAME]);
	});

	it('loads multiple tools via loadMany', () => {
		const manager = new DeferredToolManager([makeTool('workflows'), makeTool('nodes')]);
		const output = manager.loadMany(['workflows', 'nodes']);

		expect(output.loadedCount).toBe(2);
		expect(output.results).toEqual([
			expect.objectContaining({ toolName: 'workflows', status: 'loaded' }),
			expect.objectContaining({ toolName: 'nodes', status: 'loaded' }),
		]);
		expect(manager.getLoadedTools().map((tool) => tool.name)).toEqual(['workflows', 'nodes']);
	});

	it('reports already_loaded on second loadMany call', () => {
		const manager = new DeferredToolManager([makeTool('workflows')]);
		manager.loadMany(['workflows']);
		const output = manager.loadMany(['workflows']);

		expect(output.results[0]?.status).toBe('already_loaded');
	});

	it('hydrates from legacy load_tool and new load_tools transcripts', () => {
		const manager = new DeferredToolManager([makeTool('workflows'), makeTool('nodes')]);
		manager.hydrateLoadedToolsFromMessages([
			{
				id: 'msg-1',
				createdAt: new Date(),
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'legacy',
						toolName: 'load_tool',
						state: 'resolved',
						input: { toolName: 'workflows' },
						output: { status: 'loaded', toolName: 'workflows' },
					},
					{
						type: 'tool-call',
						toolCallId: 'batch',
						toolName: LOAD_TOOLS_TOOL_NAME,
						state: 'resolved',
						input: { toolNames: ['nodes'] },
						output: {
							results: [{ toolName: 'nodes', status: 'loaded' }],
							loadedCount: 1,
							message: 'ok',
						},
					},
				],
			},
		]);

		expect(manager.getLoadedTools().map((tool) => tool.name)).toEqual(['workflows', 'nodes']);
	});

	it('hydrates deferred tools referenced by pending or resolved tool calls', () => {
		const manager = new DeferredToolManager([makeTool('workflows')]);
		manager.hydrateLoadedToolsFromMessages([
			{
				id: 'msg-1',
				createdAt: new Date(),
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'pending-workflows',
						toolName: 'workflows',
						state: 'pending',
						input: { action: 'list' },
					},
				],
			},
		]);

		expect(manager.getLoadedTools().map((tool) => tool.name)).toEqual(['workflows']);
	});

	it('hydrates skill recommended tools after a successful load_skill call', () => {
		const manager = new DeferredToolManager([makeTool('workflows'), makeTool('nodes')]);
		manager.hydrateLoadedToolsFromMessages(
			[
				{
					id: 'msg-1',
					createdAt: new Date(),
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'skill',
							toolName: 'load_skill',
							state: 'resolved',
							input: { skillId: 'workflow-builder' },
							output: {
								type: 'content',
								value: [{ type: 'text', text: 'skill body' }],
							},
						},
					],
				},
			],
			{
				skillToolActivation: {
					resolveRecommendedTools: ({ skillId }) =>
						skillId === 'workflow-builder' ? ['workflows', 'nodes'] : undefined,
				},
			},
		);

		expect(manager.getLoadedTools().map((tool) => tool.name)).toEqual(['workflows', 'nodes']);
	});

	it('honors ensureLoadedToolNames for suspended resume targets', () => {
		const manager = new DeferredToolManager([makeTool('workflows')]);
		manager.hydrateLoadedToolsFromMessages([], {
			ensureLoadedToolNames: ['workflows'],
		});

		expect(manager.getLoadedTools().map((tool) => tool.name)).toEqual(['workflows']);
	});
});
