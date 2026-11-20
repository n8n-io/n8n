import {
	buildClassificationSchema,
	findReservedCategory,
	toClassificationResult,
	type Category,
} from '../classification';

const CATEGORIES: Category[] = [
	{ category: 'Billing', description: 'Payments and refunds' },
	{ category: 'Technical', description: 'Bugs and errors' },
];

describe('buildClassificationSchema', () => {
	it('asks for one boolean per category', () => {
		const schema = buildClassificationSchema(CATEGORIES, false);

		expect(Object.keys(schema.shape)).toEqual(['Billing', 'Technical']);
		expect(schema.parse({ Billing: true, Technical: false })).toEqual({
			Billing: true,
			Technical: false,
		});
	});

	it('adds the fallback key only when the Other branch is on', () => {
		expect(Object.keys(buildClassificationSchema(CATEGORIES, true).shape)).toContain('fallback');
		expect(Object.keys(buildClassificationSchema(CATEGORIES, false).shape)).not.toContain(
			'fallback',
		);
	});

	it('asks for the scores only when they were requested', () => {
		expect(Object.keys(buildClassificationSchema(CATEGORIES, false, true).shape)).toEqual([
			'Billing',
			'Technical',
			'confidence',
		]);
		expect(Object.keys(buildClassificationSchema(CATEGORIES, false).shape)).not.toContain(
			'confidence',
		);
	});

	it('asks for a score on the fallback answer too', () => {
		const parsed = buildClassificationSchema(CATEGORIES, true, true).parse({
			Billing: false,
			Technical: false,
			fallback: true,
			confidence: { Billing: 0.1, Technical: 0.1, fallback: 0.8 },
		});

		expect(parsed.confidence).toEqual({ Billing: 0.1, Technical: 0.1, fallback: 0.8 });
	});

	// Auto-fixing is on by default, so a failed parse costs a repair call.
	it.each([
		['a word', { Billing: true, Technical: false, confidence: { Billing: 'high' } }],
		['the wrong type', { Billing: true, Technical: false, confidence: 'high' }],
		['nothing at all', { Billing: true, Technical: false }],
	])('still parses when the model answers the scores with %s', (_name, answer) => {
		expect(() => buildClassificationSchema(CATEGORIES, false, true).parse(answer)).not.toThrow();
	});

	it('keeps the scores either side of one it cannot read', () => {
		const parsed = buildClassificationSchema(CATEGORIES, false, true).parse({
			Billing: true,
			Technical: false,
			confidence: { Billing: 'high', Technical: 0.2 },
		});

		expect(parsed.confidence).toEqual({ Technical: 0.2 });
	});

	it.each([
		['a number as a string', '0.8', 0.8],
		['a mirrored boolean', true, undefined],
		['an empty string', '', undefined],
	])('reads %s', (_name, given, expected) => {
		const parsed = buildClassificationSchema(CATEGORIES, false, true).parse({
			Billing: true,
			Technical: false,
			confidence: { Billing: given },
		});

		expect(parsed.confidence?.Billing).toBe(expected);
	});

	it('tells the model what the scores mean and not to flatten them', () => {
		const parsed = buildClassificationSchema(CATEGORIES, true, true);
		const map = parsed.shape.confidence;

		expect(map.description).toContain('0.0 to 1.0');
		expect(map.description).toContain('never all be high or all be the same');
	});

	it('names the category in the instruction the model reads', () => {
		const { description } = buildClassificationSchema(CATEGORIES, false).shape.Billing;

		expect(description).toContain('Billing');
		expect(description).toContain('Payments and refunds');
	});
});

describe('findReservedCategory', () => {
	it('names a category that would take the key the scores need', () => {
		expect(findReservedCategory([{ category: 'confidence', description: '' }])).toBe('confidence');
	});

	it('is silent when no category clashes', () => {
		expect(findReservedCategory(CATEGORIES)).toBeUndefined();
	});
});

describe('toClassificationResult', () => {
	it('lists the categories the model marked true', () => {
		expect(toClassificationResult({ Billing: true, Technical: false }, CATEGORIES)).toEqual({
			matched: ['Billing'],
			fallback: false,
		});
	});

	it('reads the fallback key', () => {
		expect(
			toClassificationResult({ Billing: false, Technical: false, fallback: true }, CATEGORIES)
				.fallback,
		).toBe(true);
	});

	it.each([
		['an object', { matched: true, confidence: 0.9 }],
		['a string', 'true'],
		['a number', 1],
	])('does not count %s as a match', (_name, value) => {
		expect(toClassificationResult({ Billing: value }, CATEGORIES).matched).toEqual([]);
	});

	it.each([
		['the model answered with nothing', undefined],
		['the answer is not an object', 'Billing'],
	])('matches nothing when %s', (_name, raw) => {
		expect(toClassificationResult(raw, CATEGORIES)).toEqual({ matched: [], fallback: false });
	});

	it('reads the score for each decision', () => {
		const result = toClassificationResult(
			{ Billing: true, Technical: false, confidence: { Billing: 0.92, Technical: 0.1 } },
			CATEGORIES,
		);

		expect(result.scores).toEqual({ Billing: 0.92, Technical: 0.1 });
	});

	it('holds a score the model gave for a category it rejected', () => {
		const result = toClassificationResult(
			{ Billing: false, Technical: false, confidence: { Billing: 0.2 } },
			CATEGORIES,
		);

		expect(result).toEqual({ matched: [], fallback: false, scores: { Billing: 0.2 } });
	});

	it.each([
		['above the range', 1.4, 1],
		['below the range', -2, 0],
		['at the top', 1, 1],
	])('clamps a score %s', (_name, given, expected) => {
		expect(toClassificationResult({ confidence: { Billing: given } }, CATEGORIES).scores).toEqual({
			Billing: expected,
		});
	});

	it.each([
		['a word', { Billing: 'high' }],
		['null', { Billing: null }],
		['not a number', { Billing: Number.NaN }],
	])('drops a score that is %s', (_name, confidence) => {
		expect(toClassificationResult({ confidence }, CATEGORIES).scores).toBeUndefined();
	});

	it('keeps a score of zero', () => {
		expect(toClassificationResult({ confidence: { Billing: 0 } }, CATEGORIES).scores).toEqual({
			Billing: 0,
		});
	});

	it('reports no scores at all when none were asked for', () => {
		expect(toClassificationResult({ Billing: true }, CATEGORIES)).not.toHaveProperty('scores');
	});

	it('keeps the order the user defined', () => {
		expect(toClassificationResult({ Technical: true, Billing: true }, CATEGORIES).matched).toEqual([
			'Billing',
			'Technical',
		]);
	});
});
