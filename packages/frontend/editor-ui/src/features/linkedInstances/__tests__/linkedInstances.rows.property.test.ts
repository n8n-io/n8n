import fc from 'fast-check';
import { flushPromises } from '@vue/test-utils';

import {
	useLinkedInstanceListLoad,
	useLinkedInstanceRows,
	type RowsMark,
} from '../linkedInstances.rows';
import { deferred, linkedInstance } from './linkedInstances.fixtures';

const IDS = ['a', 'b', 'c'];

type Op =
	| { kind: 'replace' | 'append' | 'remove'; id: string }
	| { kind: 'mark' }
	| { kind: 'clear' };

const opArb: fc.Arbitrary<Op> = fc.oneof(
	fc.record({
		kind: fc.constantFrom('replace' as const, 'append' as const, 'remove' as const),
		id: fc.constantFrom(...IDS),
	}),
	fc.constant({ kind: 'mark' as const }),
	fc.constant({ kind: 'clear' as const }),
);

/** What happened after each mark, kept by a plain model of the rows. */
type MarkRecord = { mark: RowsMark; cleared: boolean; written: Set<string> };

function run(ops: Op[]) {
	const rows = useLinkedInstanceRows();
	let model: string[] = [];
	const marks: MarkRecord[] = [];
	const version = new Map<string, number>();

	for (const op of ops) {
		if (op.kind === 'mark') {
			marks.push({ mark: rows.mark(), cleared: false, written: new Set() });
		} else if (op.kind === 'clear') {
			rows.clear();
			model = [];
			for (const record of marks) record.cleared = true;
		} else {
			const next = (version.get(op.id) ?? 0) + 1;
			version.set(op.id, next);
			const summary = linkedInstance({ id: op.id, name: `${op.id}-${next}` });
			if (op.kind === 'replace') rows.replace(summary);
			if (op.kind === 'append') {
				rows.append(summary);
				model = [...model.filter((id) => id !== op.id), op.id];
			}
			if (op.kind === 'remove') {
				rows.remove(op.id);
				model = model.filter((id) => id !== op.id);
			}
			for (const record of marks) record.written.add(op.id);
		}
	}
	return { rows, model, marks };
}

describe('useLinkedInstanceRows', () => {
	it('keeps the rows in the order of the model, each id once', () => {
		fc.assert(
			fc.property(fc.array(opArb, { maxLength: 40 }), (ops) => {
				const { rows, model } = run(ops);

				expect(rows.instances.value.map((item) => item.id)).toEqual(model);
				for (const id of IDS) expect(rows.isListed(id)).toBe(model.includes(id));
			}),
		);
	});

	it('says that a mark is current until the next clear', () => {
		fc.assert(
			fc.property(fc.array(opArb, { maxLength: 40 }), (ops) => {
				const { rows, marks } = run(ops);

				for (const record of marks) expect(rows.isCurrent(record.mark)).toBe(!record.cleared);
			}),
		);
	});

	it('says that a row changed after a mark exactly when that row was written after it', () => {
		fc.assert(
			fc.property(fc.array(opArb, { maxLength: 40 }), (ops) => {
				const { rows, marks } = run(ops);

				// After a clear the mark is no longer current, and callers check that first.
				for (const record of marks.filter(({ cleared }) => !cleared)) {
					for (const id of IDS) {
						expect(rows.rowChangedSince(record.mark, id)).toBe(record.written.has(id));
					}
					expect(rows.changedSince(record.mark)).toBe(record.written.size > 0);
				}
			}),
		);
	});

	it('takes the latest summary of a row on replace, and adds no row that is not listed', () => {
		const rows = useLinkedInstanceRows();
		rows.append(linkedInstance({ id: 'a', name: 'First' }));

		rows.replace(linkedInstance({ id: 'a', name: 'Second' }));
		rows.replace(linkedInstance({ id: 'z', name: 'Unknown' }));

		expect(rows.instances.value).toEqual([linkedInstance({ id: 'a', name: 'Second' })]);
	});
});

describe('useLinkedInstanceListLoad', () => {
	it('does not record a read that ends after a clear', async () => {
		const rows = useLinkedInstanceRows();
		const read = deferred<ReturnType<typeof linkedInstance>[]>();
		const list = useLinkedInstanceListLoad(rows, async () => await read.promise);

		const loading = list.fetchInstances();
		rows.clear();
		list.reset();
		read.resolve([linkedInstance()]);
		await loading;
		await flushPromises();

		expect(rows.instances.value).toEqual([]);
		expect(list.hasLoaded.value).toBe(false);
		expect(list.isLoading.value).toBe(false);
	});
});
