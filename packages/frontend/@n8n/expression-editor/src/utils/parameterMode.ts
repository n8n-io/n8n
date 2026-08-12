import {
	isResourceLocatorValue,
	type INodePropertyOptions,
	type NodeParameterValueType,
	type NodePropertyTypes,
} from 'n8n-workflow';

/**
 * Converting a parameter between fixed and expression mode. Both directions are
 * lossy in the same places, so they live together: `formatAsExpression` wraps a
 * non-string in `{{ }}` because `=true` is the string "true", and
 * `parseFromExpression` falls back to the evaluated value because the source
 * text of `{{ 1 + 1 }}` is not a number.
 */

export function isResourceLocatorParameterType(type: NodePropertyTypes) {
	return type === 'resourceLocator' || type === 'workflowSelector' || type === 'agentSelector';
}

export function formatAsExpression(
	value: NodeParameterValueType,
	parameterType: NodePropertyTypes,
) {
	if (isResourceLocatorParameterType(parameterType)) {
		if (isResourceLocatorValue(value)) {
			return {
				__rl: true,
				value: `=${value.value}`,
				mode: value.mode,
			};
		}

		return { __rl: true, value: `=${value as string}`, mode: '' };
	}

	const isNumber = parameterType === 'number';
	const isBoolean = parameterType === 'boolean';
	const isMultiOptions = parameterType === 'multiOptions';

	if (isNumber && (!value || value === '[Object: null]')) {
		return '={{ 0 }}';
	}

	if (isMultiOptions) {
		return `={{ ${JSON.stringify(value)} }}`;
	}

	if (isNumber || isBoolean || typeof value !== 'string') {
		// eslint-disable-next-line @typescript-eslint/no-base-to-string -- stringified intentionally
		return `={{ ${String(value)} }}`;
	}

	return `=${value}`;
}

export function parseFromExpression(
	currentParameterValue: NodeParameterValueType,
	evaluatedExpressionValue: unknown,
	parameterType: NodePropertyTypes,
	defaultValue: NodeParameterValueType,
	parameterOptions: INodePropertyOptions[] = [],
) {
	if (parameterType === 'multiOptions' && typeof evaluatedExpressionValue === 'string') {
		return evaluatedExpressionValue
			.split(',')
			.filter((valueItem) => parameterOptions.find((option) => option.value === valueItem));
	}

	if (
		isResourceLocatorParameterType(parameterType) &&
		isResourceLocatorValue(currentParameterValue)
	) {
		return { __rl: true, value: evaluatedExpressionValue, mode: currentParameterValue.mode };
	}

	if (parameterType === 'string') {
		return currentParameterValue
			? (currentParameterValue as string).toString().replace(/^=+/, '')
			: null;
	}

	// `json` fields (e.g. HTTP Request "JSON Body") store raw text. Switching back to
	// fixed mode must drop the internal "=" expression marker so the value parses as JSON.
	if (parameterType === 'json' && typeof currentParameterValue === 'string') {
		return currentParameterValue ? currentParameterValue.replace(/^=+/, '') : null;
	}

	if (typeof evaluatedExpressionValue !== 'undefined') {
		return evaluatedExpressionValue;
	}

	if (['number', 'boolean'].includes(parameterType)) {
		return defaultValue;
	}

	return null;
}
