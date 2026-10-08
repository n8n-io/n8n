import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
	ADD_WORKFLOW_ITEM_ID,
	countDisconnectedItems,
	SIMPLE_MENU_ITEM_IDS,
	simpleMenuItems,
} from '../simpleMenu';

type Item = { id: string; label: string; data?: { status?: string } };

const FIXED_ORDER = ['attach-files', 'computer', 'browser', ADD_WORKFLOW_ITEM_ID];

const item = (id: string, status?: string): Item => ({
	id,
	label: `Label of ${id}`,
	...(status ? { data: { status } } : {}),
});
const addWorkflow = item(ADD_WORKFLOW_ITEM_ID);

// The ids of today's menu, near misses of the kept ids, and other strings.
const idArb = fc.oneof(
	fc.constantFrom('attach-files', 'computer', 'browser', 'tools', 'preferences', 'add-workflow'),
	fc.constantFrom('attach', 'computer-status', 'browser-reconnect', 'Browser', ' computer', ''),
	fc.string(),
);
const statusArb = fc.option(
	fc.constantFrom('none', 'connecting', 'connected', 'disconnected', 'Disconnected'),
	{ nil: undefined },
);
const itemsArb = fc.array(
	fc.tuple(idArb, statusArb).map(([id, status]) => item(id, status)),
	{ maxLength: 12 },
);

describe('simpleMenuItems', () => {
	it('keeps "Attach files", the computer and the browser, then adds "New workflow"', () => {
		const items = [
			item('attach-files'),
			item('tools'),
			item('computer'),
			item('browser'),
			item('preferences'),
		];

		expect(simpleMenuItems(items, addWorkflow).map(({ id }) => id)).toEqual(FIXED_ORDER);
	});

	it('uses the fixed order, whatever the order of the input', () => {
		const items = [item('browser'), item('preferences'), item('computer'), item('attach-files')];

		expect(simpleMenuItems(items, addWorkflow).map(({ id }) => id)).toEqual(FIXED_ORDER);
	});

	it.each([
		[['attach-files'], ['attach-files', ADD_WORKFLOW_ITEM_ID]],
		[
			['attach-files', 'browser'],
			['attach-files', 'browser', ADD_WORKFLOW_ITEM_ID],
		],
		[
			['attach-files', 'computer'],
			['attach-files', 'computer', ADD_WORKFLOW_ITEM_ID],
		],
		[['tools', 'preferences'], [ADD_WORKFLOW_ITEM_ID]],
		[[], [ADD_WORKFLOW_ITEM_ID]],
	])('leaves out an item that is not available: %j', (ids, expected) => {
		expect(
			simpleMenuItems(
				ids.map((id) => item(id)),
				addWorkflow,
			).map(({ id }) => id),
		).toEqual(expected);
	});

	it('hides MCP tools, connectors and preferences, also with near-miss ids', () => {
		const items = ['tools', 'add-tool', 'preferences', 'attach', 'computer-status', ' browser'].map(
			(id) => item(id),
		);

		expect(simpleMenuItems(items, addWorkflow)).toEqual([addWorkflow]);
	});

	it('returns the same item objects, unchanged, and leaves the input as it was', () => {
		const attach = item('attach-files');
		const computer = item('computer', 'disconnected');
		const input = [computer, item('tools'), attach];
		const before = structuredClone(input);

		const result = simpleMenuItems(input, addWorkflow);

		expect(result[0]).toBe(attach);
		expect(result[1]).toBe(computer);
		expect(result[2]).toBe(addWorkflow);
		expect(input).toEqual(before);
	});

	it('keeps the first item when an id repeats, and replaces an existing "add-workflow" item', () => {
		const first = item('computer');
		const input = [first, item('computer'), item(ADD_WORKFLOW_ITEM_ID)];

		expect(simpleMenuItems(input, addWorkflow)).toEqual([first, addWorkflow]);
		expect(simpleMenuItems(input, addWorkflow)[0]).toBe(first);
	});

	describe('properties', () => {
		it('gives a subset of the input ids plus "add-workflow", once each, in the fixed order', () => {
			fc.assert(
				fc.property(itemsArb, (items) => {
					const ids = simpleMenuItems(items, addWorkflow).map(({ id }) => id);
					const inputIds = new Set(items.map(({ id }) => id));

					expect(ids.at(-1)).toBe(ADD_WORKFLOW_ITEM_ID);
					expect(ids.slice(0, -1).every((id) => inputIds.has(id))).toBe(true);
					expect(new Set(ids).size).toBe(ids.length);
					const positions = ids.map((id) => FIXED_ORDER.indexOf(id));
					expect(positions.every((position) => position >= 0)).toBe(true);
					expect(positions).toEqual([...positions].sort((a, b) => a - b));
				}),
			);
		});

		it('keeps every kept id that the input holds', () => {
			fc.assert(
				fc.property(itemsArb, (items) => {
					const ids = simpleMenuItems(items, addWorkflow).map(({ id }) => id);
					for (const keptId of SIMPLE_MENU_ITEM_IDS) {
						expect(ids.includes(keptId)).toBe(items.some(({ id }) => id === keptId));
					}
				}),
			);
		});

		it('gives the first input item with each kept id', () => {
			fc.assert(
				fc.property(itemsArb, (items) => {
					for (const kept of simpleMenuItems(items, addWorkflow).slice(0, -1)) {
						expect(items.find(({ id }) => id === kept.id)).toBe(kept);
					}
				}),
			);
		});
	});
});

describe('countDisconnectedItems', () => {
	it.each([
		[[], 0],
		[[item('computer', 'disconnected')], 1],
		[[item('computer', 'disconnected'), item('browser', 'disconnected')], 2],
		[[item('computer', 'connected'), item('browser', 'connecting'), item('attach-files')], 0],
		[[item('browser', 'Disconnected'), item('computer', 'none')], 0],
	])('counts the lost connections in %j', (items, expected) => {
		expect(countDisconnectedItems(items)).toBe(expected);
	});

	it('counts the top-level items only, so a hidden child cannot ask for attention', () => {
		const tools = { id: 'tools', children: [item('mcp-1', 'disconnected')] };

		expect(countDisconnectedItems([tools])).toBe(0);
	});

	it('grows by one for each lost connection that is added, and not for any other item', () => {
		fc.assert(
			fc.property(itemsArb, idArb, statusArb, (items, id, status) => {
				const count = countDisconnectedItems(items);
				const added = item(id, status);

				expect(countDisconnectedItems([...items, added])).toBe(
					status === 'disconnected' ? count + 1 : count,
				);
				expect(count).toBeLessThanOrEqual(items.length);
			}),
		);
	});
});
