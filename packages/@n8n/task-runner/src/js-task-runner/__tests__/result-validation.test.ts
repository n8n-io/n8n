import { ValidationError } from '@/js-task-runner/errors/validation-error';
import {
	NonArrayOfObjectsError,
	validateRunForAllItemsOutput,
	validateRunForEachItemOutput,
} from '@/js-task-runner/result-validation';

describe('result validation', () => {
	describe('validateRunForAllItemsOutput', () => {
		it('should throw an error if the output is not an object', () => {
			expect(() => {
				validateRunForAllItemsOutput(undefined);
			}).toThrowError(ValidationError);
		});

		it('should throw an error if the output is an array and at least one item has a non-n8n key', () => {
			expect(() => {
				validateRunForAllItemsOutput([{ json: {} }, { json: {}, unknownKey: {} }]);
			}).toThrowError(ValidationError);
		});

		it('should not throw an error if the output is an array and all items are json wrapped', () => {
			expect(() => {
				validateRunForAllItemsOutput([{ json: {} }, { json: {} }, { json: {} }]);
			}).not.toThrow();
		});

		it('should throw a NonArrayOfObjectsError if the output is an array of arrays (empty)', () => {
			expect(() => {
				// @ts-expect-error Intentionally invalid
				validateRunForAllItemsOutput([[]]);
			}).toThrowError(NonArrayOfObjectsError);
		});

		test.each([
			['binary', {}],
			['pairedItem', {}],
			['error', {}],
			['index', {}], // temporarily allowed until refactored out
		])(
			'should not throw an error if the output item has %s key in addition to json',
			(key, value) => {
				expect(() => {
					validateRunForAllItemsOutput([{ json: {} }, { json: {}, [key]: value }]);
				}).not.toThrow();
			},
		);

		it('should not throw an error if the output is an array and all items are not json wrapped', () => {
			expect(() => {
				validateRunForAllItemsOutput([
					{
						id: 1,
						name: 'test3',
					},
					{
						id: 2,
						name: 'test4',
					},
					{
						id: 3,
						name: 'test5',
					},
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				] as any);
			}).not.toThrow();
		});

		it('should throw if json is not an object', () => {
			expect(() => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				validateRunForAllItemsOutput([{ json: 1 } as any]);
			}).toThrowError(ValidationError);
		});
	});

	describe('validateRunForEachItemOutput', () => {
		const index = 0;

		it('should throw an error if the output is not an object', () => {
			expect(() => {
				validateRunForEachItemOutput(undefined, index);
			}).toThrowError(ValidationError);
		});

		it('should throw an error if the output is an array', () => {
			expect(() => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				validateRunForEachItemOutput([] as any, index);
			}).toThrowError(ValidationError);
		});

		it('should throw if json is not an object', () => {
			expect(() => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				validateRunForEachItemOutput({ json: 1 } as any, index);
			}).toThrowError(ValidationError);
		});

		it('should throw an error if the output is an array and at least one item has a non-n8n key', () => {
			expect(() => {
				validateRunForEachItemOutput({ json: {}, unknownKey: {} }, index);
			}).toThrowError(ValidationError);
		});

		test.each([
			['binary', {}],
			['pairedItem', {}],
			['error', {}],
		])(
			'should not throw an error if the output item has %s key in addition to json',
			(key, value) => {
				expect(() => {
					validateRunForEachItemOutput({ json: {}, [key]: value }, index);
				}).not.toThrow();
			},
		);
	});
});
