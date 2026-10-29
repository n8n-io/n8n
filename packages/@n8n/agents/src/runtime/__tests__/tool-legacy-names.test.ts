import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { AgentDbMessage, BuiltTool } from '../../types';
import { DeferredToolManager, LOAD_TOOL_TOOL_NAME } from '../tools/deferred-tool-manager';
import { fixToolCall } from '../tools/fix-tool-call';
import { buildToolMap, resolveToolForCall, toAiSdkTools } from '../tools/tool-adapter';

function makeTool(name: string, legacyNames?: string[]): BuiltTool {
	const builder = new Tool(name)
		.description(`${name} description`)
		.input(z.object({}))
		.handler(async () => await Promise.resolve({ ok: true }));
	if (legacyNames) builder.legacyNames(...legacyNames);
	return builder.build();
}

function makeActionTool(name: string, legacyName: string, ...actions: string[]): BuiltTool {
	return new Tool(name)
		.description(`${name} description`)
		.input(z.object({ id: z.string() }))
		.legacyActions(legacyName, ...actions)
		.handler(async () => await Promise.resolve({ ok: true }))
		.build();
}

function loadToolMessage(toolName: string): AgentDbMessage {
	return {
		id: 'm-1',
		role: 'assistant',
		content: [
			{
				type: 'tool-call',
				toolCallId: 'tc-1',
				toolName: LOAD_TOOL_TOOL_NAME,
				input: { toolName },
				state: 'resolved',
				output: { status: 'loaded', toolName },
			},
		],
	} as unknown as AgentDbMessage;
}

describe('tool legacy names', () => {
	it('stores legacy names on the built tool', () => {
		expect(makeTool('new_name', ['old-name']).legacyNames).toEqual(['old-name']);
		expect(makeTool('plain').legacyNames).toBeUndefined();
	});

	it('resolves a legacy name to the current tool in the tool map', () => {
		const tool = makeTool('new_name', ['old-name']);
		const map = buildToolMap([tool]);

		expect(map.get('new_name')).toBe(tool);
		expect(map.get('old-name')).toBe(tool);
	});

	it('lets a current tool name win over another tool legacy name', () => {
		const renamed = makeTool('new_name', ['shared']);
		const current = makeTool('shared');
		const map = buildToolMap([renamed, current]);

		expect(map.get('shared')).toBe(current);
	});

	it('does not expose legacy names to the model', () => {
		const aiTools = toAiSdkTools([makeTool('new_name', ['old-name'])]);

		expect(Object.keys(aiTools)).toEqual(['new_name']);
	});

	it('loads a deferred tool requested by its legacy name', () => {
		const manager = new DeferredToolManager([makeTool('new_name', ['old-name'])]);

		const result = manager.load('old-name');

		expect(result.status).toBe('loaded');
		expect(result.toolName).toBe('new_name');
		expect(manager.getLoadedTools().map((t) => t.name)).toEqual(['new_name']);
	});

	it('resolves a legacy name in getTool', () => {
		const tool = makeTool('new_name', ['old-name']);
		const manager = new DeferredToolManager([tool]);

		expect(manager.getTool('old-name')).toBe(tool);
	});

	it('gives a shared legacy name to the first tool, as the tool map does', () => {
		const first = makeTool('first', ['shared-old']);
		const second = makeTool('second', ['shared-old']);
		const manager = new DeferredToolManager([first, second]);

		expect(manager.load('shared-old').toolName).toBe('first');
		expect(buildToolMap([first, second]).get('shared-old')).toBe(first);
	});

	it('hydrates a deferred tool loaded under its legacy name', () => {
		const manager = new DeferredToolManager([makeTool('new_name', ['old-name'])]);

		manager.hydrateLoadedToolsFromMessages([loadToolMessage('old-name')]);

		expect(manager.getLoadedTools().map((t) => t.name)).toEqual(['new_name']);
	});

	describe('legacy actions', () => {
		const publish = makeActionTool('publish_item', 'items', 'publish', 'republish');
		const remove = makeActionTool('delete_item', 'items', 'delete');

		it('stores legacy actions on the built tool', () => {
			expect(publish.legacyActions).toEqual({ items: ['publish', 'republish'] });
		});

		it('resolves a former split tool by the call action', () => {
			const map = buildToolMap([publish, remove]);

			expect(resolveToolForCall(map, 'items', { action: 'publish', id: '1' })).toBe(publish);
			expect(resolveToolForCall(map, 'items', '{"action":"delete","id":"1"}')).toBe(remove);
			expect(resolveToolForCall(map, 'items', { action: 'unknown' })).toBeUndefined();
			expect(resolveToolForCall(map, 'items', undefined)).toBeUndefined();
		});

		it('keeps current names ahead of legacy actions', () => {
			const map = buildToolMap([publish, remove]);

			expect(resolveToolForCall(map, 'publish_item', { action: 'delete' })).toBe(publish);
		});

		it('lets a registered tool with the former name win over legacy actions', () => {
			const items = makeTool('items');
			const map = buildToolMap([publish, items]);

			expect(resolveToolForCall(map, 'items', { action: 'publish' })).toBe(items);
		});

		it('resolves a deferred tool by the call action in getTool', () => {
			const manager = new DeferredToolManager([publish, remove]);

			expect(manager.getTool('items', { action: 'delete' })).toBe(remove);
			expect(manager.getTool('items', '{"action":"publish","id":"1"}')).toBe(publish);
			expect(manager.getTool('items', { action: 'unknown' })).toBeUndefined();
		});

		it('lets a registered deferred tool with the former name win over legacy actions', () => {
			const items = makeTool('items');
			const manager = new DeferredToolManager([publish, items]);

			expect(manager.getTool('items', { action: 'publish' })).toBe(items);
		});

		it('repairs a model call of the former name and drops the action', async () => {
			const map = buildToolMap([publish, remove]);

			const repaired = await fixToolCall(
				{
					toolCall: {
						toolCallId: 'tc-1',
						toolName: 'items',
						input: '{"action":"delete","id":"1"}',
					},
					error: { name: 'AI_NoSuchToolError' } as never,
				},
				map,
			);

			expect(repaired).toEqual(
				expect.objectContaining({ toolName: 'delete_item', input: '{"id":"1"}' }),
			);
		});
	});
});
