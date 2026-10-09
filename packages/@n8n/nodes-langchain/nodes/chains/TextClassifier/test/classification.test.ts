import {
	buildClassificationSchema,
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

	it('names the category in the instruction the model reads', () => {
		const { description } = buildClassificationSchema(CATEGORIES, false).shape.Billing;

		expect(description).toContain('Billing');
		expect(description).toContain('Payments and refunds');
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

	// A schema that made each category an object would make every value truthy, and
	// every item would route to every branch.
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

	it('keeps the order the user defined', () => {
		expect(toClassificationResult({ Technical: true, Billing: true }, CATEGORIES).matched).toEqual([
			'Billing',
			'Technical',
		]);
	});
});
