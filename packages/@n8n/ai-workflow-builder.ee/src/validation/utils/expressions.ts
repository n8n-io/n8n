import type { INodeParameters } from 'n8n-workflow';
import { isExpression } from 'n8n-workflow';

export function containsExpression(value: unknown): boolean {
	if (!isExpression(value)) {
		return false;
	}

	return /\{\{[\s\S]*(?:\$\([\s\S]*?\)|\$\w+)[\s\S]*}}/.test(value);
}

export function nodeParametersContainExpression(parameters: INodeParameters): boolean {
	for (const value of Object.values(parameters)) {
		if (containsExpression(value)) {
			return true;
		}

		if (value && typeof value === 'object' && !Array.isArray(value)) {
			if (nodeParametersContainExpression(value as INodeParameters)) {
				return true;
			}
		}

		if (Array.isArray(value)) {
			for (const item of value) {
				if (containsExpression(item)) {
					return true;
				}

				if (item && typeof item === 'object') {
					if (nodeParametersContainExpression(item as INodeParameters)) {
						return true;
					}
				}
			}
		}
	}

	return false;
}
