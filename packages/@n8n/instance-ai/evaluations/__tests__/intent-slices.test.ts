import { computeSlices, extractIntentUnits } from '../cli/intent-slices';

const knownSlugs = new Set(['case-a', 'case-b']);

function report(testCases: unknown[]): unknown {
	return { testCases };
}

describe('extractIntentUnits', () => {
	it('extracts only intent-prefixed expectations, ignoring other expectations and non-agent cases', () => {
		const units = extractIntentUnits(
			report([
				{
					testCaseFile: 'case-a',
					buildExpectationResultsPerRun: [
						[
							{
								expectation: 'intent: anchor + embeds_other exact-match',
								pass: true,
								reason: 'ok',
							},
							{
								expectation: 'load_skill: calls the intent-recognition skill',
								pass: false,
								reason: 'nope',
							},
						],
					],
				},
				{
					testCaseFile: 'not-a-known-case',
					buildExpectationResultsPerRun: [
						[
							{
								expectation: 'intent: anchor + embeds_other exact-match',
								pass: true,
								reason: 'ok',
							},
						],
					],
				},
			]),
			knownSlugs,
		);

		expect(units).toEqual([{ fileSlug: 'case-a', pass: true }]);
	});

	it('skips incomplete verdicts and null iterations, counting multiple iterations separately', () => {
		const units = extractIntentUnits(
			report([
				{
					testCaseFile: 'case-a',
					buildExpectationResultsPerRun: [
						[
							{
								expectation: 'intent: anchor + embeds_other exact-match',
								pass: true,
								reason: 'ok',
							},
						],
						null,
						[
							{
								expectation: 'intent: anchor + embeds_other exact-match',
								pass: false,
								reason: 'no verdict',
								incomplete: true,
							},
						],
						[
							{
								expectation: 'intent: anchor + embeds_other exact-match',
								pass: false,
								reason: 'miss',
							},
						],
					],
				},
			]),
			knownSlugs,
		);

		expect(units).toEqual([
			{ fileSlug: 'case-a', pass: true },
			{ fileSlug: 'case-a', pass: false },
		]);
	});

	it('treats each compound part in a run as its own unit', () => {
		const units = extractIntentUnits(
			report([
				{
					testCaseFile: 'case-a',
					buildExpectationResultsPerRun: [
						[
							{
								expectation: 'intent [first]: anchor + embeds_other exact-match',
								pass: true,
								reason: 'ok',
							},
							{
								expectation: 'intent [second]: anchor + embeds_other exact-match',
								pass: false,
								reason: 'miss',
							},
						],
					],
				},
			]),
			knownSlugs,
		);

		expect(units).toEqual([
			{ fileSlug: 'case-a', pass: true },
			{ fileSlug: 'case-a', pass: false },
		]);
	});

	it('skips entries missing testCaseFile without throwing', () => {
		expect(() =>
			extractIntentUnits(
				report([
					{
						buildExpectationResultsPerRun: [
							[
								{
									expectation: 'intent: anchor + embeds_other exact-match',
									pass: true,
									reason: 'ok',
								},
							],
						],
					},
				]),
				knownSlugs,
			),
		).not.toThrow();

		const units = extractIntentUnits(
			report([
				{
					buildExpectationResultsPerRun: [
						[
							{
								expectation: 'intent: anchor + embeds_other exact-match',
								pass: true,
								reason: 'ok',
							},
						],
					],
				},
			]),
			knownSlugs,
		);
		expect(units).toEqual([]);
	});

	it('throws a descriptive error on a malformed top-level report', () => {
		expect(() => extractIntentUnits({ testCases: 'not-an-array' }, knownSlugs)).toThrow(
			/testCases/,
		);
		expect(() => extractIntentUnits('not-an-object', knownSlugs)).toThrow();
	});
});

describe('computeSlices', () => {
	const meta = new Map([
		['easy-tag1', { tags: ['intent-resolution', 'false-friend'], complexity: 'simple' }],
		['med-tag2', { tags: ['intent-resolution', 'surface-vocab'], complexity: 'medium' }],
	]);

	it('produces correct per-slice counts and accuracy, with a unit contributing to every tag/difficulty it belongs to', () => {
		const units = [
			{ fileSlug: 'easy-tag1', pass: true },
			{ fileSlug: 'easy-tag1', pass: false },
			{ fileSlug: 'med-tag2', pass: true },
		];

		const rows = computeSlices(units, meta);
		const bySlice = Object.fromEntries(rows.map((r) => [r.slice, r]));

		expect(bySlice.overall).toMatchObject({ units: 3, passed: 2, accuracy: 2 / 3 });
		expect(bySlice['difficulty:easy']).toMatchObject({ units: 2, passed: 1, accuracy: 0.5 });
		expect(bySlice['difficulty:med']).toMatchObject({ units: 1, passed: 1, accuracy: 1 });
		expect(bySlice['difficulty:hard']).toBeUndefined();
		expect(bySlice['tag:false-friend']).toMatchObject({ units: 2, passed: 1, accuracy: 0.5 });
		expect(bySlice['tag:surface-vocab']).toMatchObject({ units: 1, passed: 1, accuracy: 1 });
		// intent-resolution is on every case — excluded as redundant with overall.
		expect(bySlice['tag:intent-resolution']).toBeUndefined();
	});

	it('omits zero-unit slices entirely', () => {
		const rows = computeSlices([{ fileSlug: 'easy-tag1', pass: true }], meta);
		expect(rows.some((r) => r.slice === 'difficulty:med')).toBe(false);
		expect(rows.some((r) => r.slice === 'difficulty:hard')).toBe(false);
		expect(rows.some((r) => r.slice === 'tag:surface-vocab')).toBe(false);
	});

	it('sets bar and underBar on monitored slices on both sides of the threshold, and leaves them unset on unmonitored slices', () => {
		const passingUnits = Array.from({ length: 4 }, () => ({ fileSlug: 'easy-tag1', pass: true }));
		const passingRows = computeSlices(passingUnits, meta);
		const passingBySlice = Object.fromEntries(passingRows.map((r) => [r.slice, r]));
		expect(passingBySlice.overall).toMatchObject({ bar: 0.75, underBar: false });
		expect(passingBySlice['tag:false-friend']).toMatchObject({ bar: 0.8, underBar: false });
		expect(passingBySlice['difficulty:easy']).toMatchObject({ bar: 0.9, underBar: false });

		const failingUnits = [
			{ fileSlug: 'easy-tag1', pass: false },
			{ fileSlug: 'easy-tag1', pass: false },
			{ fileSlug: 'easy-tag1', pass: true },
		];
		const failingRows = computeSlices(failingUnits, meta);
		const failingBySlice = Object.fromEntries(failingRows.map((r) => [r.slice, r]));
		expect(failingBySlice.overall).toMatchObject({ underBar: true });
		expect(failingBySlice['tag:false-friend']).toMatchObject({ underBar: true });
		expect(failingBySlice['difficulty:easy']).toMatchObject({ underBar: true });

		// Unmonitored difficulty tier and tag carry neither field.
		const medRow = computeSlices([{ fileSlug: 'med-tag2', pass: false }], meta).find(
			(r) => r.slice === 'difficulty:med',
		);
		expect(medRow?.bar).toBeUndefined();
		expect(medRow?.underBar).toBeUndefined();
		const tagRow = computeSlices([{ fileSlug: 'med-tag2', pass: false }], meta).find(
			(r) => r.slice === 'tag:surface-vocab',
		);
		expect(tagRow?.bar).toBeUndefined();
		expect(tagRow?.underBar).toBeUndefined();
	});

	it('maps complexity to difficulty: simple->easy, medium->med, complex->hard', () => {
		const fullMeta = new Map([
			['s', { tags: [], complexity: 'simple' }],
			['m', { tags: [], complexity: 'medium' }],
			['c', { tags: [], complexity: 'complex' }],
		]);
		const rows = computeSlices(
			[
				{ fileSlug: 's', pass: true },
				{ fileSlug: 'm', pass: true },
				{ fileSlug: 'c', pass: true },
			],
			fullMeta,
		);
		const slices = rows.map((r) => r.slice);
		expect(slices).toEqual(
			expect.arrayContaining(['difficulty:easy', 'difficulty:med', 'difficulty:hard']),
		);
	});
});
