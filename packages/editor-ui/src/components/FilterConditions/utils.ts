import { resolveParameter } from '@/composables/useWorkflowHelpers';
import { i18n } from '@/plugins/i18n';
import { isExpression } from '@/utils/expressions';
import {
	FilterError,
	executeFilterCondition,
	validateFieldType,
	type FilterConditionValue,
	type FilterOperatorType,
	type FilterOptionsValue,
	type NodeParameterValue,
	type INodeProperties,
} from 'n8n-workflow';
import { OPERATORS_BY_ID, type FilterOperatorId } from './constants';
import type { ConditionResult, FilterOperator } from './types';

export const getFilterOperator = (key: string) =>
	OPERATORS_BY_ID[key as FilterOperatorId] as FilterOperator;

const convertToType = (value: unknown, type: FilterOperatorType): unknown => {
	if (type === 'any') return value;

	const fallback = type === 'boolean' ? false : value;

	return validateFieldType('filter', value, type, { parseStrings: true }).newValue ?? fallback;
};

export const handleOperatorChange = ({
	condition,
	newOperator,
}: {
	condition: FilterConditionValue;
	newOperator: FilterOperator;
}): FilterConditionValue => {
	const currentOperator = condition.operator;
	const rightType = currentOperator.rightType ?? currentOperator.type;
	const newRightType = newOperator.rightType ?? newOperator.type;
	const leftTypeChanged = currentOperator.type !== newOperator.type;
	const rightTypeChanged = rightType !== newRightType;

	// Try to convert left & right values to operator type
	if (leftTypeChanged && !isExpression(condition.leftValue)) {
		condition.leftValue = convertToType(condition.leftValue, newOperator.type);
	}
	if (rightTypeChanged && !newOperator.singleValue && !isExpression(condition.rightValue)) {
		condition.rightValue = convertToType(condition.rightValue, newRightType);
	}

	condition.operator = {
		type: newOperator.type,
		operation: newOperator.operation,
		rightType: newOperator.rightType,
		singleValue: newOperator.singleValue,
	};

	return condition;
};

export const resolveCondition = ({
	condition,
	options,
	index = 0,
}: {
	condition: FilterConditionValue;
	options: FilterOptionsValue;
	index?: number;
}): ConditionResult => {
	try {
		const resolved = resolveParameter(
			condition as unknown as NodeParameterValue,
		) as FilterConditionValue;

		if (resolved.leftValue === undefined || resolved.rightValue === undefined) {
			return { status: 'resolve_error' };
		}
		try {
			const result = executeFilterCondition(resolved, options, {
				index,
				errorFormat: 'inline',
			});
			return { status: 'success', result };
		} catch (error) {
			let errorMessage = i18n.baseText('parameterInput.error');

			if (error instanceof FilterError) {
				errorMessage = `${error.message}.\n${error.description}`;
			}
			return {
				status: 'validation_error',
				error: errorMessage,
			};
		}
	} catch (error) {
		return { status: 'resolve_error' };
	}
};

export const operatorTypeToNodeProperty = (
	operatorType: FilterOperatorType,
): Pick<INodeProperties, 'type' | 'options'> => {
	switch (operatorType) {
		case 'boolean':
			return {
				type: 'options',
				options: [
					{ name: 'true', value: true },
					{ name: 'false', value: false },
				],
			};
		case 'array':
		case 'object':
		case 'any':
			return { type: 'string' };
		default:
			return { type: operatorType };
	}
};
