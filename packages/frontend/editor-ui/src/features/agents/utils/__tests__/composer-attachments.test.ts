import { describe, expect, it } from 'vitest';
import { mergeClientContextPatches } from '../composer-attachments';

const chip = (id: string) => ({ id, label: id });

describe('mergeClientContextPatches', () => {
	it('returns undefined when no chip adds context', () => {
		expect(mergeClientContextPatches([])).toBeUndefined();
		expect(mergeClientContextPatches([{ chip: chip('a') }])).toBeUndefined();
		expect(
			mergeClientContextPatches([{ chip: chip('a'), clientContextPatch: {} }]),
		).toBeUndefined();
	});

	it('keeps a __proto__ key as a field of the merged context', () => {
		const patch = JSON.parse('{"__proto__": {"id": "a"}}') as Record<string, unknown>;
		const merged = mergeClientContextPatches([{ chip: chip('a'), clientContextPatch: patch }]);

		expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
		expect(JSON.stringify(merged)).toBe('{"__proto__":{"id":"a"}}');
	});

	it('joins array values in the order the chips were added', () => {
		expect(
			mergeClientContextPatches([
				{ chip: chip('a'), clientContextPatch: { attachments: [{ id: 'a' }] } },
				{ chip: chip('b') },
				{ chip: chip('c'), clientContextPatch: { attachments: [{ id: 'c' }] } },
			]),
		).toEqual({ attachments: [{ id: 'a' }, { id: 'c' }] });
	});

	it('lets the last patch win for other values', () => {
		expect(
			mergeClientContextPatches([
				{ chip: chip('a'), clientContextPatch: { mode: 'first', list: [1], keep: true } },
				{ chip: chip('b'), clientContextPatch: { mode: 'second', list: 'not-an-array' } },
			]),
		).toEqual({ mode: 'second', list: 'not-an-array', keep: true });
	});

	it('starts from the base context and then applies the chip patches', () => {
		expect(
			mergeClientContextPatches(
				[{ chip: chip('a'), clientContextPatch: { attachments: [{ id: 'a' }], mode: 'chip' } }],
				{ attachments: [{ id: 'base' }], mode: 'base', timeZone: 'UTC' },
			),
		).toEqual({ attachments: [{ id: 'base' }, { id: 'a' }], mode: 'chip', timeZone: 'UTC' });
		expect(mergeClientContextPatches([{ chip: chip('a') }], { timeZone: 'UTC' })).toEqual({
			timeZone: 'UTC',
		});
	});

	it('does not change the patches it merges', () => {
		const patch = { attachments: [{ id: 'a' }] };
		const base = { attachments: [{ id: 'base' }] };
		mergeClientContextPatches(
			[
				{ chip: chip('a'), clientContextPatch: patch },
				{ chip: chip('b'), clientContextPatch: { attachments: [{ id: 'b' }] } },
			],
			base,
		);

		expect(patch).toEqual({ attachments: [{ id: 'a' }] });
		expect(base).toEqual({ attachments: [{ id: 'base' }] });
	});
});
