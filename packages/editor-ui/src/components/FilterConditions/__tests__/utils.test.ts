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
					newOperator: getFilterOperator('number:equals'),
				}),
			).toEqual({
				id: '1',
				leftValue: 45,
				rightValue: 'notANumber',
				operator: {
					name: 'filter.operator.equals',
					operation: 'equals',
					type: 'string',
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
					newOperator: getFilterOperator('boolean:equals'),
				}),
			).toEqual({
				id: '1',
				leftValue: false,
				rightValue: true,
				operator: {
					name: 'filter.operator.equals',
					operation: 'equals',
					type: 'string',
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
			).toEqual(condition);
		});
	});
});
