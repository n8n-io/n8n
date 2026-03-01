import { sortByProperty } from './sortByProperty';

const arrayOfObjects = [
	{ name: 'Álvaro', age: 30 },
	{ name: 'Élodie', age: 28 },
	{ name: 'Željko', age: 25 },
	{ name: 'Bob', age: 35 },
];

describe('sortByProperty', () => {
	it('should sort an array of objects by a property', () => {
		const sortedArray = sortByProperty('name', arrayOfObjects);
		expect(sortedArray).toEqual([
			{ name: 'Álvaro', age: 30 },
			{ name: 'Bob', age: 35 },
			{ name: 'Élodie', age: 28 },
			{ name: 'Željko', age: 25 },
		]);
	});

	it('should sort an array of objects by a property in descending order', () => {
		const sortedArray = sortByProperty('name', arrayOfObjects, 'desc');
		expect(sortedArray).toEqual([
			{ name: 'Željko', age: 25 },
			{ name: 'Élodie', age: 28 },
			{ name: 'Bob', age: 35 },
			{ name: 'Álvaro', age: 30 },
		]);
	});

	it('should sort an array of objects by a property if its number', () => {
		const sortedArray = sortByProperty('age', arrayOfObjects);
		expect(sortedArray).toEqual([
			{ name: 'Željko', age: 25 },
			{ name: 'Élodie', age: 28 },
			{ name: 'Álvaro', age: 30 },
			{ name: 'Bob', age: 35 },
		]);
	});

	it('should sort an array of objects by a property in descending order if its number', () => {
		const sortedArray = sortByProperty('age', arrayOfObjects, 'desc');
		expect(sortedArray).toEqual([
			{ name: 'Bob', age: 35 },
			{ name: 'Álvaro', age: 30 },
			{ name: 'Élodie', age: 28 },
			{ name: 'Željko', age: 25 },
		]);
	});
});
