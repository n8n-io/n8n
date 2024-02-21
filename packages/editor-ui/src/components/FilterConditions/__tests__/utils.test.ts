import { getFilterOperator, handleOperatorChange } from '../utils';

describe('FilterConditions > utils', () => {
	describe('handleOperatorChange', () => {
		test('should convert string > number', () => {
			const condition = {
				id: '1',
				leftValue: '45',
				rightValue: 'notANumber',
				operator: getFilterOperator('string:equals'),
			};
			expect(
				handleOperatorChange({
					condition,
					newOperator: getFilterOperator('number:gt'),
				}),
			).toEqual({
				id: '1',
				leftValue: 45,
				rightValue: 'notANumber',
				operator: {
					operation: 'gt',
					type: 'number',
				},
			});
		});

		test('should convert string > boolean', () => {
			const condition = {
				id: '1',
				leftValue: 'notABool',
				rightValue: 'true',
				operator: getFilterOperator('string:equals'),
			};
			expect(
				handleOperatorChange({
					condition,
					newOperator: getFilterOperator('boolean:notEquals'),
				}),
			).toEqual({
				id: '1',
				leftValue: false,
				rightValue: true,
				operator: {
					operation: 'notEquals',
					type: 'boolean',
				},
			});
		});

		test('should not convert or clear expressions', () => {
			const condition = {
				id: '1',
				leftValue: '={{ $json.foo }}',
				rightValue: '={{ $("nodename").foo }}',
				operator: getFilterOperator('string:equals'),
			};
			expect(
				handleOperatorChange({
					condition,
					newOperator: getFilterOperator('boolean:equals'),
				}),
			).toEqual({
				id: '1',
				leftValue: '={{ $json.foo }}',
				rightValue: '={{ $("nodename").foo }}',
				operator: {
					operation: 'equals',
					type: 'boolean',
				},
			});
		});
	});
});
