import type { IDataObject, INodeExecutionData, IRunData, ITaskData } from 'n8n-workflow';

import { estimateItemsSize, estimateTaskDataSize, RunSharing } from '../estimate-run-data-size';

// Mirrors the byte model in the estimator, so the exact cases below read as arithmetic.
const variables: Record<string, unknown> = process.config.variables;
const POINTER_COMPRESSION = Boolean(variables.v8_enable_pointer_compression);
const SLOT = POINTER_COMPRESSION ? 4 : 8;
const ITEM = 15 * SLOT;
const HEAP_NUMBER = SLOT + 8;
const objectBytes = (properties: number) => (3 + properties) * SLOT;
const arrayBytes = (elements: number) => (6 + elements) * SLOT;
const stringBytes = (length: number) => SLOT + 8 + length;

const record = (index: number) => ({
	id: index,
	name: `customer-${index}`,
	email: `customer-${index}@example.com`,
	total: 49.99,
	isPaid: index % 2 === 0,
});

const toItems = (count: number): INodeExecutionData[] =>
	Array.from({ length: count }, (_, i) => ({ json: record(i) }));

/** The estimate of `items` without their item wrappers. */
const dataBytes = (items: INodeExecutionData[]) =>
	estimateItemsSize(items, new WeakSet()) - items.length * ITEM;

const taskData = (
	data: ITaskData['data'],
	{ inputOverride, source = [] }: Partial<Pick<ITaskData, 'inputOverride' | 'source'>> = {},
): ITaskData =>
	({ startTime: 0, executionTime: 0, executionIndex: 0, source, data, inputOverride }) as ITaskData;

/** Run data in which `nodeName` produced `outputs` on its first run. */
const runDataOf = (nodeName: string, outputs: INodeExecutionData[][]): IRunData => ({
	[nodeName]: [taskData({ main: outputs })],
});

/** Copies of `items` as the engine passes them to the next node: new wrappers, same `json`. */
const asInputOf = (items: INodeExecutionData[], input?: number): INodeExecutionData[] =>
	items.map((item, index) => ({ ...item, pairedItem: { item: index, input } }));

describe('estimateItemsSize', () => {
	it('should return 0 for an empty output', () => {
		expect(estimateItemsSize([], new WeakSet())).toBe(0);
	});

	it('should count objects, arrays, strings and numbers by their heap layout', () => {
		const items = [
			{ json: { name: 'abc', tags: ['x'], count: 3, ratio: 0.5, ok: true, none: null } },
		];

		const expected =
			ITEM +
			objectBytes(6) +
			stringBytes(3) + // name
			arrayBytes(1) +
			stringBytes(1) + // tags
			0 + // count is a small integer, stored in its slot
			HEAP_NUMBER + // ratio
			0 + // ok
			0; // none

		expect(estimateItemsSize(items, new WeakSet())).toBe(expected);
	});

	it('should count an integer as small only in the range of the build', () => {
		// Unix timestamps in seconds are small integers without pointer compression.
		const timestamp = 1_760_000_000;
		const expected = POINTER_COMPRESSION ? HEAP_NUMBER : 0;

		expect(dataBytes([{ json: { timestamp } }])).toBe(objectBytes(1) + expected);
		expect(dataBytes([{ json: { big: 2 ** 31 } }])).toBe(objectBytes(1) + HEAP_NUMBER);
		expect(dataBytes([{ json: { small: -(2 ** 29) } }])).toBe(objectBytes(1));
	});

	it('should count binary entries', () => {
		const data = 'a'.repeat(1_000);
		const items = [{ json: {}, binary: { file: { data, mimeType: 'text/plain' } } }];

		const binaryBytes = objectBytes(1) + objectBytes(2) + stringBytes(1_000) + stringBytes(10);

		expect(estimateItemsSize(items, new WeakSet())).toBe(ITEM + objectBytes(0) + binaryBytes);
	});

	it('should count a wrapper for every item, also in a large output', () => {
		const items = Array.from({ length: 10_000 }, () => ({ json: {} }));

		expect(estimateItemsSize(items, new WeakSet())).toBe(10_000 * (ITEM + objectBytes(0)));
	});

	it('should measure every item when the output is small', () => {
		const items = toItems(5);
		const sumOfSingles = items.reduce(
			(sum, item) => sum + estimateItemsSize([{ json: { ...item.json } }], new WeakSet()),
			0,
		);

		expect(estimateItemsSize(items, new WeakSet())).toBe(sumOfSingles);
	});

	it('should extrapolate a sample when the output is large', () => {
		const single = dataBytes([{ json: record(5_000) }]);

		const estimate = dataBytes(toItems(10_000));

		expect(estimate).toBeGreaterThan(single * 10_000 * 0.95);
		expect(estimate).toBeLessThan(single * 10_000 * 1.05);
	});

	describe('counting each object once', () => {
		it('should count only the wrappers for items passed on unchanged', () => {
			const seen = new WeakSet<object>();
			const items = toItems(100);
			estimateItemsSize(items, seen);

			expect(estimateItemsSize(items, seen)).toBe(100 * ITEM);
		});

		it('should count only the new wrapper when a node nests earlier data', () => {
			const seen = new WeakSet<object>();
			const items = toItems(3);
			estimateItemsSize(items, seen);

			const wrapped = [{ json: { results: items.map((item) => item.json) } }];

			expect(estimateItemsSize(wrapped, seen)).toBe(ITEM + objectBytes(1) + arrayBytes(3));
		});

		it('should count a binary entry once when new items share it', () => {
			const seen = new WeakSet<object>();
			const binary = { file: { data: 'a'.repeat(1_000), mimeType: 'text/plain' } };
			estimateItemsSize([{ json: {}, binary }], seen);

			expect(estimateItemsSize([{ json: {}, binary }], seen)).toBe(ITEM + objectBytes(0));
		});

		it('should count once a new object that many items of a large output share', () => {
			const shared = { data: 'x'.repeat(100_000) };
			const items = Array.from({ length: 10_000 }, () => ({ json: { shared } }));

			const expected = 10_000 * (ITEM + objectBytes(1)) + objectBytes(1) + stringBytes(100_000);

			expect(estimateItemsSize(items, new WeakSet())).toBe(expected);
		});

		it('should count once a new object that many entries of a large array share', () => {
			const shared = { data: 'x'.repeat(100_000) };
			const list = Array.from({ length: 1_000 }, () => ({ shared }));

			const expected =
				objectBytes(1) +
				arrayBytes(1_000) +
				1_000 * objectBytes(1) +
				objectBytes(1) +
				stringBytes(100_000);

			expect(dataBytes([{ json: { list } }])).toBe(expected);
		});

		it('should count once an object that every item holds twice', () => {
			const shared = { data: 'x'.repeat(100_000) };
			const items = Array.from({ length: 10_000 }, () => ({ json: { a: shared, b: shared } }));

			const expected = 10_000 * (ITEM + objectBytes(2)) + objectBytes(1) + stringBytes(100_000);

			expect(estimateItemsSize(items, new WeakSet())).toBe(expected);
		});

		it('should count once an object and an object inside it that both have other references', () => {
			const child = { data: 'x'.repeat(100_000) };
			const parent = { child };
			const anotherChild = { data: 'x'.repeat(100_000) };
			const anotherParent = { child: anotherChild };

			const expected = objectBytes(3) + objectBytes(1) + objectBytes(1) + stringBytes(100_000);

			expect(dataBytes([{ json: { first: parent, second: child, third: parent } }])).toBe(expected);
			expect(
				dataBytes([{ json: { first: anotherParent, second: anotherParent, third: anotherChild } }]),
			).toBe(expected);
		});

		it('should count in every item an object that each item holds twice', () => {
			const items = Array.from({ length: 1_000 }, () => {
				const own = { data: 'x'.repeat(1_000) };
				return { json: { first: own, second: own } };
			});

			const perItem = objectBytes(2) + objectBytes(1) + stringBytes(1_000);

			expect(dataBytes(items)).toBe(1_000 * perItem);
		});

		it('should count an object once when it appears twice in one output', () => {
			const shared = { value: 'a'.repeat(100) };
			const items = [{ json: { first: shared, second: shared } }];

			const expected = ITEM + objectBytes(2) + objectBytes(1) + stringBytes(100);

			expect(estimateItemsSize(items, new WeakSet())).toBe(expected);
		});
	});

	describe('large and unusual values', () => {
		it('should sample a large array inside a single item', () => {
			const list = Array.from({ length: 100_000 }, (_, i) => record(i));
			const single = dataBytes([{ json: record(50_000) }]);

			const estimate = dataBytes([{ json: { list } }]);

			const expected = objectBytes(1) + arrayBytes(100_000) + single * 100_000;
			expect(estimate).toBeGreaterThan(expected * 0.95);
			expect(estimate).toBeLessThan(expected * 1.05);
		});

		it('should not run a getter in an object or an array', () => {
			const throwing = {
				enumerable: true,
				get() {
					throw new Error('A getter is node code, so the estimator must not run it');
				},
			};
			const record = Object.defineProperty({ id: 1 }, 'computed', throwing);
			const list = Object.defineProperty(['a'], '1', throwing);

			expect(dataBytes([{ json: { record, list } }])).toBe(
				objectBytes(2) + objectBytes(2) + arrayBytes(2) + stringBytes(1),
			);
		});

		it('should not run a proxy trap', () => {
			const trap = () => {
				throw new Error('A proxy trap is node code, so the estimator must not run it');
			};
			const proxy = new Proxy({}, { get: trap, ownKeys: trap, getPrototypeOf: trap });

			expect(dataBytes([{ json: { proxy } }])).toBe(objectBytes(1));
		});

		it('should not grow with the number of items that share a proxy', () => {
			const proxy = new Proxy({}, {});
			const items = Array.from({ length: 10_000 }, () => ({ json: { proxy } }));

			expect(dataBytes(items)).toBe(10_000 * objectBytes(1));
		});

		it('should not run a proxy trap in the prototype chain', () => {
			const trap = () => {
				throw new Error('A proxy trap is node code, so the estimator must not run it');
			};
			const proxy = new Proxy({}, { has: trap, get: trap, getPrototypeOf: trap });
			const record: object = Object.setPrototypeOf({ id: 1 }, proxy);
			const list: unknown[] = Object.setPrototypeOf(['a'], proxy);
			list[2] = 'c';

			expect(dataBytes([{ json: { record, list } }])).toBeGreaterThan(0);
		});

		it('should count a sparse array by its elements, not its length', () => {
			const byId: unknown[] = [];
			byId[1_234_567_890] = 'x';

			expect(dataBytes([{ json: { byId } }])).toBe(objectBytes(1) + arrayBytes(1) + stringBytes(1));
		});

		it('should count a sparse array the same wherever its elements are', () => {
			const atStart: unknown[] = [];
			atStart[0] = 'x';
			atStart[1_000_000_000] = 'y';
			const afterStart: unknown[] = [];
			afterStart[1] = 'x';
			afterStart[1_000_000_000] = 'y';

			const expected = objectBytes(1) + arrayBytes(2) + 2 * stringBytes(1);
			expect(dataBytes([{ json: { list: atStart } }])).toBe(expected);
			expect(dataBytes([{ json: { list: afterStart } }])).toBe(expected);
		});

		it('should read a buffer by its length instead of walking its bytes', () => {
			const buffer = Buffer.alloc(10 * 1024 * 1024);

			expect(dataBytes([{ json: { buffer } }])).toBe(objectBytes(1) + buffer.byteLength);
		});

		it('should count the whole buffer behind a small view', () => {
			const buffer = new ArrayBuffer(1024 * 1024);
			const view = new Uint8Array(buffer, 0, 8);

			expect(dataBytes([{ json: { view } }])).toBe(objectBytes(1) + buffer.byteLength);
		});

		it('should count a buffer once when several views share it', () => {
			const buffer = new ArrayBuffer(1024 * 1024);
			const views = [new Uint8Array(buffer), new DataView(buffer), new Float64Array(buffer)];

			expect(dataBytes([{ json: { views } }])).toBe(
				objectBytes(1) + arrayBytes(3) + buffer.byteLength,
			);
		});

		it('should not run a getter that replaces the buffer of a view', () => {
			const view = new Uint8Array(new ArrayBuffer(16));
			Object.defineProperty(view, 'buffer', {
				get() {
					throw new Error('A getter is node code, so the estimator must not run it');
				},
			});

			expect(dataBytes([{ json: { view } }])).toBe(objectBytes(1) + 16);
		});

		it('should handle circular references', () => {
			const node: IDataObject = { name: 'loop' };
			node.self = node;

			expect(dataBytes([{ json: node }])).toBe(objectBytes(2) + stringBytes(4));
		});

		it('should stop at the depth limit and leave deeper objects for later', () => {
			let deepest: IDataObject = { leaf: 'x' };
			const innermost = deepest;
			for (let i = 0; i < 100; i++) deepest = { child: deepest };

			const seen = new WeakSet<object>();
			const estimate = estimateItemsSize([{ json: deepest }], seen);

			expect(estimate).toBeGreaterThan(0);
			expect(seen.has(innermost)).toBe(false);
			expect(estimateItemsSize([{ json: innermost }], seen)).toBe(
				ITEM + objectBytes(1) + stringBytes(1),
			);
		});

		it('should charge values and repeated references against the walk budget', () => {
			class CountingSet extends WeakSet<object> {
				expanded = 0;

				override add(value: object) {
					this.expanded++;
					return super.add(value);
				}
			}
			const leaf = () => Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`v${i}`, i]));
			const items = Array.from({ length: 10 }, () => ({
				json: Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, leaf()])),
			}));
			const seen = new CountingSet();

			estimateItemsSize(items, seen);

			// Each leaf has 100 values, so the budget of 10,000 entries covers about 100 leaves.
			expect(seen.expanded).toBeGreaterThan(0);
			expect(seen.expanded).toBeLessThan(200);
		});

		it('should count once an object that every entry of every level holds, also past the budget', () => {
			const chain = () => {
				let node: IDataObject = { leaf: 'x' };
				for (let level = 0; level < 60; level++) {
					const child = node;
					node = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, child]));
				}
				return node;
			};
			const one = dataBytes([{ json: chain() }]);

			expect(dataBytes([{ json: chain() }, { json: chain() }])).toBe(2 * one);
		});

		it('should estimate a structure larger than the walk budget by sampling it', () => {
			const leaf = () => ({ id: 1, name: 'x' });
			const level = (size: number, child: () => object) =>
				Object.fromEntries(Array.from({ length: size }, (_, i) => [`key${i}`, child()]));
			const items = Array.from({ length: 10 }, () => ({
				json: level(100, () => level(100, leaf)),
			}));

			const leafBytes = objectBytes(2) + stringBytes(1);
			const exact = 10 * (objectBytes(100) + 100 * (objectBytes(100) + 100 * leafBytes));

			const estimate = dataBytes(items);

			expect(estimate).toBeGreaterThan(exact * 0.9);
			expect(estimate).toBeLessThan(exact * 1.1);
		});

		it('should measure whole records when the walk budget cannot cover every sample', () => {
			const items = Array.from({ length: 10 }, () => ({
				json: Object.fromEntries(
					Array.from({ length: 100 }, (_, field) => [
						`field${field}`,
						Array.from({ length: 10 }, (__, id) => ({
							id,
							details: { payload: 'x'.repeat(1_000) },
						})),
					]),
				),
			}));
			const separately = items.reduce((sum, item) => sum + dataBytes([item]), 0);

			const estimate = dataBytes(items);

			expect(estimate).toBeGreaterThan(separately * 0.95);
			expect(estimate).toBeLessThan(separately * 1.05);
		});

		it('should ignore an item without json', () => {
			const items = [{ json: null }] as unknown as INodeExecutionData[];

			expect(estimateItemsSize(items, new WeakSet())).toBe(ITEM);
		});
	});
});

describe('estimateTaskDataSize', () => {
	it('should sum every output of every connection type', () => {
		const main0 = toItems(2);
		const main1 = toItems(3);
		const tool = toItems(1);
		const expected =
			estimateItemsSize(main0, new WeakSet()) +
			estimateItemsSize(main1, new WeakSet()) +
			estimateItemsSize(tool, new WeakSet());

		const estimate = estimateTaskDataSize(
			taskData({ main: [main0, null, main1], ai_tool: [tool] }),
			{},
			new WeakSet(),
		);

		expect(estimate).toBe(expected);
	});

	it('should count the input override', () => {
		const input = toItems(2);

		const estimate = estimateTaskDataSize(
			taskData(undefined, { inputOverride: { main: [input] } }),
			{},
			new WeakSet(),
		);

		expect(estimate).toBe(estimateItemsSize(input, new WeakSet()));
	});

	it('should return 0 for a node run without data', () => {
		expect(estimateTaskDataSize(taskData(undefined), {}, new WeakSet())).toBe(0);
	});

	describe('items passed on from the input', () => {
		const source = [{ previousNode: 'Source', previousNodeOutput: 0, previousNodeRun: 0 }];

		it('should count only wrappers for items that a node reorders or filters', () => {
			const sourceItems = toItems(1_000);
			const runData = runDataOf('Source', [sourceItems]);
			const input = asInputOf(sourceItems);

			const reordered = [...input].reverse();
			const filtered = input.filter((_, i) => i % 3 !== 0);

			expect(
				estimateTaskDataSize(taskData({ main: [reordered] }, { source }), runData, new WeakSet()),
			).toBe(reordered.length * ITEM);
			expect(
				estimateTaskDataSize(taskData({ main: [filtered] }, { source }), runData, new WeakSet()),
			).toBe(filtered.length * ITEM);
		});

		it('should count only wrappers for items that a node routes to several outputs', () => {
			const sourceItems = toItems(100);
			const input = asInputOf(sourceItems);

			const estimate = estimateTaskDataSize(
				taskData({ main: [input.slice(0, 40), input.slice(40)] }, { source }),
				runDataOf('Source', [sourceItems]),
				new WeakSet(),
			);

			expect(estimate).toBe(100 * ITEM);
		});

		it('should resolve items from the second input of a node', () => {
			const first = toItems(20);
			const second = toItems(30);
			const runData = { ...runDataOf('First', [first]), ...runDataOf('Second', [second]) };
			const appended = [...asInputOf(first, 0), ...asInputOf(second, 1)];

			const estimate = estimateTaskDataSize(
				taskData(
					{ main: [appended] },
					{ source: [{ previousNode: 'First' }, { previousNode: 'Second' }] },
				),
				runData,
				new WeakSet(),
			);

			expect(estimate).toBe(50 * ITEM);
		});

		it('should resolve a source on a later output and run', () => {
			const sourceItems = toItems(20);
			const runData: IRunData = {
				Source: [taskData({ main: [[]] }), taskData({ main: [[], sourceItems] })],
			};

			const estimate = estimateTaskDataSize(
				taskData(
					{ main: [asInputOf(sourceItems)] },
					{ source: [{ previousNode: 'Source', previousNodeOutput: 1, previousNodeRun: 1 }] },
				),
				runData,
				new WeakSet(),
			);

			expect(estimate).toBe(20 * ITEM);
		});

		it('should resolve the source that a loop node sets on the paired item', () => {
			const feederItems = toItems(30);
			const runData = runDataOf('Feeder', [feederItems]);
			const batch = feederItems.slice(10, 20).map((item, index) => ({
				json: item.json,
				pairedItem: { item: index + 10, sourceOverwrite: { previousNode: 'Feeder' } },
			}));

			const estimate = estimateTaskDataSize(
				taskData({ main: [batch] }, { source: [{ previousNode: 'Loop body' }] }),
				runData,
				new WeakSet(),
			);

			expect(estimate).toBe(10 * ITEM);
		});

		it('should accept a paired item given as a number or a list', () => {
			const sourceItems = toItems(2);
			const output = [
				{ json: sourceItems[0].json, pairedItem: 0 },
				{ json: sourceItems[1].json, pairedItem: [{ item: 1 }, { item: 0 }] },
			];

			const estimate = estimateTaskDataSize(
				taskData({ main: [output] }, { source }),
				runDataOf('Source', [sourceItems]),
				new WeakSet(),
			);

			expect(estimate).toBe(2 * ITEM);
		});

		it('should count new json for a paired item', () => {
			const sourceItems = toItems(5);
			const transformed = sourceItems.map((item, index) => ({
				json: { ...item.json, extra: 'value' },
				pairedItem: { item: index },
			}));

			const estimate = estimateTaskDataSize(
				taskData({ main: [transformed] }, { source }),
				runDataOf('Source', [sourceItems]),
				new WeakSet(),
			);

			expect(estimate).toBe(estimateItemsSize(transformed, new WeakSet()));
		});

		it('should count only the new json when a node keeps the binary of its input', () => {
			const binary = { file: { data: 'a'.repeat(1_000), mimeType: 'text/plain' } };
			const sourceItems = [{ json: { id: 1 }, binary }];
			const output = [{ json: { id: 2 }, binary, pairedItem: { item: 0 } }];

			const estimate = estimateTaskDataSize(
				taskData({ main: [output] }, { source }),
				runDataOf('Source', [sourceItems]),
				new WeakSet(),
			);

			expect(estimate).toBe(ITEM + objectBytes(1));
		});

		it('should count an item whose pairing points at a different item', () => {
			const sourceItems = toItems(2);
			const output = [{ json: sourceItems[1].json, pairedItem: { item: 0 } }];

			const estimate = estimateTaskDataSize(
				taskData({ main: [output] }, { source }),
				runDataOf('Source', [sourceItems]),
				new WeakSet(),
			);

			expect(estimate).toBe(
				estimateItemsSize([{ json: { ...sourceItems[1].json } }], new WeakSet()),
			);
		});

		it('should count an item whose source is missing', () => {
			const items = asInputOf(toItems(3));

			const estimate = estimateTaskDataSize(
				taskData({ main: [items] }, { source: [{ previousNode: 'Unknown' }] }),
				{},
				new WeakSet(),
			);

			expect(estimate).toBe(estimateItemsSize(items, new WeakSet()));
		});
	});
});

describe('RunSharing', () => {
	const payloadOf = (char: string) => ({ data: char.repeat(100) });
	const payloadBytes = objectBytes(1) + stringBytes(100);

	const estimateRuns = (runs: IDataObject[]) => {
		const sharing = new RunSharing();
		const seen = new WeakSet<object>();
		runs.forEach((json, run) =>
			estimateItemsSize([{ json }], seen, undefined, { runs: sharing, run }),
		);
		return sharing;
	};

	it('should report the bytes of an object that a later run holds too, for the run that counted it', () => {
		const shared = payloadOf('x');

		const sharing = estimateRuns([{ shared }, { other: payloadOf('y') }, { shared }]);

		expect(sharing.sharedBytesOf(0)).toBe(payloadBytes);
		expect(sharing.sharedBytesOf(1)).toBe(0);
		expect(sharing.sharedBytesOf(2)).toBe(0);
	});

	it('should count a nested object once when later runs hold it and its parent', () => {
		const inner = payloadOf('x');
		const outer = { inner };

		const sharing = estimateRuns([{ outer }, { inner }, { outer }]);

		expect(sharing.sharedBytesOf(0)).toBe(objectBytes(1) + payloadBytes);
	});

	it('should not report an object that only one run holds twice', () => {
		const payload = payloadOf('x');

		const sharing = estimateRuns([{ first: payload, second: payload }]);

		expect(sharing.sharedBytesOf(0)).toBe(0);
	});
});
