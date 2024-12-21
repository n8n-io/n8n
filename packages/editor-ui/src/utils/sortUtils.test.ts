import { sortByProperty, sublimeSearch } from '@/utils/sortUtils';

const arrayOfObjects = [
	{ name: 'Álvaro', age: 30 },
	{ name: 'Élodie', age: 28 },
	{ name: 'Željko', age: 25 },
	{ name: 'Bob', age: 35 },
];

describe('sortUtils', () => {
	it('"sortByProperty" should sort an array of objects by a property', () => {
		const sortedArray = sortByProperty('name', arrayOfObjects);
		expect(sortedArray).toEqual([
			{ name: 'Álvaro', age: 30 },
			{ name: 'Bob', age: 35 },
			{ name: 'Élodie', age: 28 },
			{ name: 'Željko', age: 25 },
		]);
	});

	it('"sortByProperty" should sort an array of objects by a property in descending order', () => {
		const sortedArray = sortByProperty('name', arrayOfObjects, 'desc');
		expect(sortedArray).toEqual([
			{ name: 'Željko', age: 25 },
			{ name: 'Élodie', age: 28 },
			{ name: 'Bob', age: 35 },
			{ name: 'Álvaro', age: 30 },
		]);
	});

	it('"sortByProperty" should sort an array of objects by a property if its number', () => {
		const sortedArray = sortByProperty('age', arrayOfObjects);
		expect(sortedArray).toEqual([
			{ name: 'Željko', age: 25 },
			{ name: 'Élodie', age: 28 },
			{ name: 'Álvaro', age: 30 },
			{ name: 'Bob', age: 35 },
		]);
	});

	it('"sortByProperty" should sort an array of objects by a property in descending order if its number', () => {
		const sortedArray = sortByProperty('age', arrayOfObjects, 'desc');
		expect(sortedArray).toEqual([
			{ name: 'Bob', age: 35 },
			{ name: 'Álvaro', age: 30 },
			{ name: 'Élodie', age: 28 },
			{ name: 'Željko', age: 25 },
		]);
	});
});

describe('sublimeSearch', () => {
	const weights = [
		{ key: 'displayName', weight: 1.3 },
		{ key: 'alias', weight: 1.0 },
	];

	it('should prioritize exact word matches over substring matches', () => {
		const data = [
			{ displayName: 'Agent Smith', alias: 'agent' },
			{ displayName: 'Reagent', alias: 'chemical' },
		];

		const results = sublimeSearch('agent', data, weights);

		expect(results[0].item.displayName).toBe('Agent Smith');
		expect(results[1].item.displayName).toBe('Reagent');
	});

	it('should respect field weights when scoring matches', () => {
		const data = [
			{ displayName: 'Code', alias: 'programming' },
			{ displayName: 'Transform', alias: 'code' },
		];

		const results = sublimeSearch('code', data, weights);

		expect(results[0].item.displayName).toBe('Code');
		expect(results[1].item.displayName).toBe('Transform');
	});

	it('should handle case-insensitive matches', () => {
		const data = [
			{ displayName: 'CODE', alias: 'programming' },
			{ displayName: 'Decoder', alias: 'DECODE' },
		];

		const results = sublimeSearch('code', data, weights);

		expect(results.length).toBe(2);
		expect(results[0].item.displayName).toBe('CODE');
	});

	it('should handle array values', () => {
		const data = [
			{ displayName: 'Test', alias: ['code', 'programming'] },
			{ displayName: 'Sample', alias: ['test', 'example'] },
		];

		const results = sublimeSearch('code', data, weights);

		expect(results.length).toBe(1);
		expect(results[0].item.displayName).toBe('Test');
	});

	it('should return empty array when no matches found', () => {
		const data = [
			{ displayName: 'Test', alias: 'testing' },
			{ displayName: 'Sample', alias: 'example' },
		];

		const results = sublimeSearch('nonexistent', data, weights);

		expect(results).toEqual([]);
	});

	it('should handle fuzzy matches as lowest priority', () => {
		const data = [
			{ displayName: 'Code Base', alias: 'codebase' },
			{ displayName: 'Customer', alias: 'cstmr' },
		];

		const results = sublimeSearch('code', data, weights);

		expect(results[0].item.displayName).toBe('Code Base');
		// Customer might or might not be included depending on fuzzy match threshold
	});

	it('should score exact word matches higher than partial word matches', () => {
		const data = [
			{ displayName: 'Code Generator', alias: 'generator' },
			{ displayName: 'Decoder Tool', alias: 'tool' },
		];

		const results = sublimeSearch('code', data, weights);

		expect(results[0].item.displayName).toBe('Code Generator');
		expect(results[1].item.displayName).toBe('Decoder Tool');
	});

	it('should handle empty search string', () => {
		const data = [
			{ displayName: 'Test', alias: 'testing' },
			{ displayName: 'Sample', alias: 'example' },
		];

		const results = sublimeSearch('', data, weights);

		expect(results).toEqual([]);
	});

	it('should handle empty data array', () => {
		const results = sublimeSearch('test', [], weights);

		expect(results).toEqual([]);
	});

	it('should preserve score in results', () => {
		const data = [
			{ displayName: 'Code', alias: 'programming' },
			{ displayName: 'Decoder', alias: 'tool' },
		];

		const results = sublimeSearch('code', data, weights);

		expect(results[0].score).toBeDefined();
		expect(results[0].score).toBeGreaterThan(0);
		expect(results[0].score).toBeGreaterThan(results[1].score);
	});
});
