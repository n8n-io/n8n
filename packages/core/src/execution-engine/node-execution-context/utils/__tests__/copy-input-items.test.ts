import { copyInputItems } from '../copy-input-items';

describe('copyInputItems', () => {
	it('should pick only selected properties', () => {
		const output = copyInputItems(
			[
				{
					json: {
						a: 1,
						b: true,
						c: {},
					},
				},
			],
			['a'],
		);
		expect(output).toEqual([{ a: 1 }]);
	});

	it('should convert undefined to null', () => {
		const output = copyInputItems(
			[
				{
					json: {
						a: undefined,
					},
				},
			],
			['a'],
		);
		expect(output).toEqual([{ a: null }]);
	});

	it('should clone objects', () => {
		const input = {
			a: { b: 5 },
		};
		const output = copyInputItems(
			[
				{
					json: input,
				},
			],
			['a'],
		);
		expect(output[0].a).toEqual(input.a);
		expect(output[0].a === input.a).toEqual(false);
	});

	it.each(['__proto__', 'constructor', 'prototype'])(
		'should isolate items from inherited properties when given "%s"',
		(propertyName) => {
			const output = copyInputItems(
				[{ json: { [propertyName]: 'test_value', safe: 1 } }],
				[propertyName, 'safe'],
			);

			expect(output[0]).toHaveProperty('safe', 1);
			expect(Object.getOwnPropertyNames(output[0])).toContain(propertyName);
		},
	);
});
