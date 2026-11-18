import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool, LegacyCallConverter } from '../../types';
import { fixToolCall } from '../tools/fix-tool-call';
import {
	buildToolMap,
	resolveToolCallTarget,
	resolveToolForCall,
	toAiSdkTools,
} from '../tools/tool-adapter';
import { ToolCatalog } from '../tools/tool-catalog';

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

	it('resolves a legacy name in the tool catalog', () => {
		const tool = makeTool('new_name', ['old-name']);
		const catalog = new ToolCatalog([tool]);

		expect(catalog.getTool('old-name')).toBe(tool);
	});

	it('gives a shared legacy name to the first tool, as the tool map does', () => {
		const first = makeTool('first', ['shared-old']);
		const second = makeTool('second', ['shared-old']);
		const catalog = new ToolCatalog([first, second]);

		expect(catalog.getTool('shared-old')).toBe(first);
		expect(buildToolMap([first, second]).get('shared-old')).toBe(first);
	});

	it('routes call_tool with a legacy name to the current tool', () => {
		const tool = makeTool('new_name', ['old-name']);
		const catalog = new ToolCatalog([tool]);
		const map = buildToolMap(catalog.getControllerTools());

		expect(resolveToolForCall(map, 'call_tool', { tool: 'old-name', arguments: {} })).toBe(tool);
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
			const manager = new ToolCatalog([publish, remove]);

			expect(manager.getTool('items', { action: 'delete' })).toBe(remove);
			expect(manager.getTool('items', '{"action":"publish","id":"1"}')).toBe(publish);
			expect(manager.getTool('items', { action: 'unknown' })).toBeUndefined();
		});

		it('lets a registered deferred tool with the former name win over legacy actions', () => {
			const items = makeTool('items');
			const manager = new ToolCatalog([publish, items]);

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

	describe('a batch tool that replaces the write tools of a split tool', () => {
		// Shaped like the data table tools: one tool for each read action, and one batch
		// tool that took over the per-action write tools and the write actions of `items`.
		const formerNames = ['items', 'items-old'];
		const writeActions = { create: 'create_item', delete: 'delete_item' };
		const readTools = ['list', 'get'].map((action) => {
			const tool = new Tool(`${action}_items`)
				.description(`${action} items`)
				.input(z.object({ id: z.string() }));
			for (const former of formerNames) tool.legacyActions(former, action);
			return tool.handler(async () => await Promise.resolve({ ok: true })).build();
		});
		const batchBuilder = new Tool('change_items')
			.description('change items')
			.input(z.object({ changes: z.array(z.unknown()) }))
			.legacyNames(...Object.values(writeActions));
		for (const former of formerNames) {
			batchBuilder.legacyActions(former, ...Object.keys(writeActions));
		}
		const batch = batchBuilder.handler(async () => await Promise.resolve({ ok: true })).build();
		const map = buildToolMap([...readTools, batch]);

		it('resolves every former write tool name to the batch tool', () => {
			for (const name of Object.values(writeActions)) {
				expect(resolveToolForCall(map, name, { id: '1' })).toBe(batch);
				expect(resolveToolCallTarget(map, name, { id: '1' })?.tool).toBe(batch);
			}
		});

		it('resolves write actions of the former split tool to the batch tool', () => {
			for (const former of formerNames) {
				for (const action of Object.keys(writeActions)) {
					expect(resolveToolForCall(map, former, { action, id: '1' })).toBe(batch);
					expect(resolveToolCallTarget(map, former, { action, id: '1' })?.tool).toBe(batch);
				}
			}
		});

		it('keeps read actions of the former split tool on the read tools', () => {
			for (const former of formerNames) {
				expect(resolveToolForCall(map, former, { action: 'list' })).toBe(readTools[0]);
				expect(resolveToolCallTarget(map, former, { action: 'get' })?.tool).toBe(readTools[1]);
			}
		});

		it('lets a registered per-action write tool keep its own name', () => {
			const create = makeTool('create_item');
			const both = buildToolMap([...readTools, batch, create]);

			expect(resolveToolForCall(both, 'create_item', {})).toBe(create);
			expect(resolveToolForCall(both, 'delete_item', {})).toBe(batch);
		});
	});

	it('stores a resume-only converter on the built tool', () => {
		const convert: LegacyCallConverter = (_formerName, input) => input;
		const tool = new Tool('current')
			.description('current')
			.input(z.object({}))
			.legacyNames('old')
			.legacyForResumeOnly(convert)
			.handler(async () => await Promise.resolve({ ok: true }))
			.build();

		expect(tool.legacyResumeOnly?.convert).toBe(convert);
		expect(makeTool('plain').legacyResumeOnly).toBeUndefined();
	});
});
