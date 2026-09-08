import { itemsForNode } from '../node-keyed-items';

describe('itemsForNode', () => {
	it('returns the items a node has of its own', () => {
		expect(itemsForNode({ Slack: [{ ok: true }] }, 'Slack')).toEqual([{ ok: true }]);
	});

	it('returns undefined for a node the map does not hold', () => {
		expect(itemsForNode({ Slack: [{ ok: true }] }, 'Absent')).toBeUndefined();
		expect(itemsForNode(undefined, 'Slack')).toBeUndefined();
	});

	// Own-key semantics, not a name blocklist. A node really can be called
	// `toString`, and its fixture has to survive: rejecting the name outright
	// would silently strip the items the caller stored under it.
	it.each(['toString', 'valueOf', 'constructor', 'hasOwnProperty', '__proto__'])(
		'reads the items stored under an own key named %s',
		(nodeName) => {
			const map = Object.fromEntries([[nodeName, [{ ok: true }]]]) as Record<
				string,
				Array<Record<string, unknown>>
			>;

			expect(itemsForNode(map, nodeName)).toEqual([{ ok: true }]);
		},
	);

	// The `Object.hasOwn` half of the guard. `Array.isArray` alone rejects the
	// inherited values a plain object carries, because none of them is an
	// array — so only a prototype that holds array values tells the two apart.
	it('ignores an inherited entry even when it looks like items', () => {
		const map = Object.create({ Slack: [{ inherited: true }] }) as Record<
			string,
			Array<Record<string, unknown>>
		>;

		expect(map.Slack).toEqual([{ inherited: true }]);
		expect(itemsForNode(map, 'Slack')).toBeUndefined();
	});

	// The `Array.isArray` half: an inherited method must not be handed back as
	// an item list, which is what made callers treat it as one.
	it.each(['toString', 'valueOf', 'constructor'])(
		'ignores the inherited %s of a map that has no such node',
		(nodeName) => {
			expect(itemsForNode({ Slack: [{ ok: true }] }, nodeName)).toBeUndefined();
		},
	);

	it('returns undefined when an own entry is not an array', () => {
		const map = { Slack: 'not-items' } as unknown as Record<string, unknown[]>;

		expect(itemsForNode(map, 'Slack')).toBeUndefined();
	});
});
