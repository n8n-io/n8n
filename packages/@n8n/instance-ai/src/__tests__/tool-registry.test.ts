import type { BuiltTool, ToolContext } from '@n8n/agents';
import { describe, it, expect, vi } from 'vitest';

import {
	createToolRegistry,
	mergeToolRegistries,
	filterToolRegistry,
	wrapToolRegistryWithCache,
} from '../tool-registry';

const dummyCtx = {} as ToolContext;

describe('tool-registry', () => {
	it('creates, merges, and filters tool registries', () => {
		const toolA: BuiltTool = {
			name: 'toolA',
			description: 'A',
			handler: vi.fn(),
		} as unknown as BuiltTool;
		const toolB: BuiltTool = {
			name: 'toolB',
			description: 'B',
			handler: vi.fn(),
		} as unknown as BuiltTool;

		const regA = createToolRegistry([['toolA', toolA]]);
		const regB = createToolRegistry([['toolB', toolB]]);

		const merged = mergeToolRegistries(regA, regB);
		expect(merged.size).toBe(2);
		expect(merged.get('toolA')).toBe(toolA);
		expect(merged.get('toolB')).toBe(toolB);

		const filtered = filterToolRegistry(merged, ([name]) => name === 'toolA');
		expect(filtered.size).toBe(1);
		expect(filtered.has('toolA')).toBe(true);
		expect(filtered.has('toolB')).toBe(false);
	});

	it('caches deterministic tool calls when wrapped with cache', async () => {
		const mockHandler = vi
			.fn()
			.mockImplementation(async (input: { action: string; query: string }) => {
				return { definitions: [{ nodeType: input.query, content: 'mock' }] };
			});

		const nodesTool: BuiltTool = {
			name: 'nodes',
			description: 'Nodes tool',
			handler: mockHandler,
		} as unknown as BuiltTool;

		const registry = createToolRegistry([['nodes', nodesTool]]);
		const cachedRegistry = wrapToolRegistryWithCache(registry);

		const wrappedNodes = cachedRegistry.get('nodes')!;

		// First call
		const res1 = await wrappedNodes.handler!(
			{ action: 'type-definition', query: 'whatsapp' },
			dummyCtx,
		);
		expect(mockHandler).toHaveBeenCalledTimes(1);
		expect(res1).toEqual({ definitions: [{ nodeType: 'whatsapp', content: 'mock' }] });

		// Second identical call (different key ordering)
		const res2 = await wrappedNodes.handler!(
			{ query: 'whatsapp', action: 'type-definition' },
			dummyCtx,
		);
		expect(mockHandler).toHaveBeenCalledTimes(1); // Not called again!
		expect(res2).toEqual(res1);

		// Non-deterministic action (e.g. execute) is not cached
		const executeHandler = vi.fn().mockResolvedValue({ status: 'success' });
		const execTool: BuiltTool = {
			name: 'nodes',
			description: 'Nodes tool',
			handler: executeHandler,
		} as unknown as BuiltTool;

		const execRegistry = wrapToolRegistryWithCache(createToolRegistry([['nodes', execTool]]));
		const wrappedExec = execRegistry.get('nodes')!;

		await wrappedExec.handler!({ action: 'execute', type: 'test' }, dummyCtx);
		await wrappedExec.handler!({ action: 'execute', type: 'test' }, dummyCtx);
		expect(executeHandler).toHaveBeenCalledTimes(2);
	});
});
