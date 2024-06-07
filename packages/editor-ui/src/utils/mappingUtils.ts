import type { INodeProperties, NodeParameterValueType } from 'n8n-workflow';
import { isResourceLocatorValue } from 'n8n-workflow';
import { isExpression } from './expressions';

const validJsIdNameRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

function isValidJsIdentifierName(name: string | number): boolean {
	return validJsIdNameRegex.test(name.toString());
}

export function generatePath(root: string, path: Array<string | number>): string {
	return path.reduce((accu: string, part: string | number) => {
		if (typeof part === 'number') {
			return `${accu}[${part}]`;
		}

		if (!isValidJsIdentifierName(part)) {
			return `${accu}['${escapeMappingString(part)}']`;
		}

		return `${accu}.${part}`;
	}, root);
}

export function escapeMappingString(str: string): string {
	return str.replace(/\'/g, "\\'");
}

export function getMappedExpression({
	nodeName,
	distanceFromActive,
	path,
}: {
	nodeName: string;
	distanceFromActive: number;
	path: Array<string | number> | string;
}) {
	const root =
		distanceFromActive === 1
			? '$json'
			: generatePath(`$('${escapeMappingString(nodeName)}')`, ['item', 'json']);

	if (typeof path === 'string') {
		return `{{ ${root}${path} }}`;
	}

	return `{{ ${generatePath(root, path)} }}`;
}

const unquote = (str: string) => {
	if (str.startsWith('"') && str.endsWith('"')) {
		return str.slice(1, -1).replace(/\\"/g, '"');
	}

	if (str.startsWith("'") && str.endsWith("'")) {
		return str.slice(1, -1).replace(/\\'/g, "'");
	}

	return str;
};

export function propertyNameFromExpression(expression: string): string {
	return expression
		.replace(/^{{\s*|\s*}}$/g, '')
		.replace(/^(\$\(.*\)\.item\.json|\$json|\$node\[.*\]\.json)\.?(.*)/, '$2');
}

export function getMappedResult(
	parameter: INodeProperties,
	newParamValue: string,
	prevParamValue: NodeParameterValueType,
): string {
	const prevValue =
		parameter.type === 'resourceLocator' && isResourceLocatorValue(prevParamValue)
			? prevParamValue.value
			: prevParamValue;

	if (parameter.requiresDataPath) {
		const propertyName = propertyNameFromExpression(newParamValue);

		if (parameter.requiresDataPath === 'multiple') {
			if (typeof prevValue === 'string' && (prevValue.trim() === '=' || prevValue.trim() === '')) {
				return propertyName;
			}

			return `${prevValue}, ${propertyName}`;
		}

		return propertyName;
	} else if (typeof prevValue === 'string' && isExpression(prevValue) && prevValue.length > 1) {
		return `${prevValue} ${newParamValue}`;
	} else if (prevValue && ['string', 'json'].includes(parameter.type)) {
		return prevValue === '=' ? `=${newParamValue}` : `=${prevValue} ${newParamValue}`;
	}

	return `=${newParamValue}`;
}
