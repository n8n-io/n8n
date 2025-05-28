import type { NodeParameterValueType, INodeParameterResourceLocator } from 'n8n-workflow';

function isRlcValue(value: NodeParameterValueType): value is INodeParameterResourceLocator {
	return Boolean(
		typeof value === 'object' && value && 'value' in value && '__rl' in value && value.__rl,
	);
}

export function checkNodeParameterNotEmpty(value: NodeParameterValueType) {
	if (value === undefined || value === null || value === '') {
		return false;
	}

	if (isRlcValue(value)) {
		return checkNodeParameterNotEmpty(value.value);
	}

	return true;
}
