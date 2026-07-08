import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { BuiltTool } from '../../../types/sdk/tool';
import { DeferredToolManager, LOAD_TOOLS_TOOL_NAME } from '../deferred-tool-manager';

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

	describe('tool gates', () => {
		const gates = { 'build-workflow': ['workflow-builder'] };

		it('rejects gated tools from load_tools until the owning skill is loaded', () => {
			const manager = new DeferredToolManager([makeTool('build-workflow')], { toolGates: gates });

			const gatedOutput = manager.loadMany(['build-workflow']);
			expect(gatedOutput.loadedCount).toBe(0);
			expect(gatedOutput.results[0]).toMatchObject({
				toolName: 'build-workflow',
				status: 'gated',
				gatedBySkills: ['workflow-builder'],
			});
			expect(gatedOutput.message).toContain('workflow-builder');

			manager.markSkillLoaded({ skillId: 'workflow-builder' });
			const unlockedOutput = manager.loadMany(['build-workflow']);
			expect(unlockedOutput.results[0]?.status).toBe('loaded');
		});

		it('hides gated tools from search until the owning skill is loaded', async () => {
			const manager = new DeferredToolManager([makeTool('build-workflow'), makeTool('nodes')], {
				toolGates: gates,
			});
			const searchTool = manager.getControllerTools().find((tool) => tool.name === 'search_tools')!;

			const before = (await searchTool.handler?.({ query: 'build-workflow' }, {})) as {
				results: Array<{ name: string }>;
			};
			expect(before.results.map((result) => result.name)).not.toContain('build-workflow');

			manager.markSkillLoaded({ name: 'workflow-builder' });
			const after = (await searchTool.handler?.({ query: 'build-workflow' }, {})) as {
				results: Array<{ name: string }>;
			};
			expect(after.results.map((result) => result.name)).toContain('build-workflow');
		});

		it('unlocks gates during hydration from a resolved main load_skill call', () => {
			const manager = new DeferredToolManager([makeTool('build-workflow')], { toolGates: gates });
			manager.hydrateLoadedToolsFromMessages([
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
							output: { type: 'content', value: [{ type: 'text', text: 'skill body' }] },
						},
					],
				},
			]);

			expect(manager.loadMany(['build-workflow']).results[0]?.status).toBe('loaded');
		});

		it('keeps gates locked after hydration resets state', () => {
			const manager = new DeferredToolManager([makeTool('build-workflow')], { toolGates: gates });
			manager.markSkillLoaded({ skillId: 'workflow-builder' });
			manager.hydrateLoadedToolsFromMessages([]);

			expect(manager.loadMany(['build-workflow']).results[0]?.status).toBe('gated');
		});
	});
});
