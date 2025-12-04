import { isResourceLocatorValue } from 'n8n-workflow';
import type { INodeProperties, NodeParameterValueType } from 'n8n-workflow';
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
	const root = getNodeParentExpression({ nodeName, distanceFromActive });

	if (typeof path === 'string') {
		return `{{ ${root}${path} }}`;
	}

	return `{{ ${generatePath(root, path)} }}`;
}

export function getNodeParentExpression({
	nodeName,
	distanceFromActive,
}: {
	nodeName: string;
	distanceFromActive: number;
}) {
	return distanceFromActive === 1
		? '$json'
		: generatePath(`$('${escapeMappingString(nodeName)}')`, ['item', 'json']);
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

export function propertyNameFromExpression(expression: string, forceBracketAccess = false): string {
	const propPath = expression
		.replace(/^{{\s*|\s*}}$/g, '')
		.replace(/^(\$\(.*\)\.item\.json|\$json|\$node\[.*\]\.json)\.?(.*)/, '$2');

	const isSingleBracketAccess = propPath.startsWith('[') && !propPath.slice(1).includes('[');
	if (isSingleBracketAccess && !forceBracketAccess) {
		// "['Key with spaces']" -> "Key with spaces"
		return unquote(propPath.slice(1, -1));
	}

	return propPath;
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
		if (parameter.requiresDataPath === 'multiple') {
			const propertyName = propertyNameFromExpression(newParamValue, true);
			if (typeof prevValue === 'string' && (prevValue.trim() === '=' || prevValue.trim() === '')) {
				return propertyName;
			}

			return `${prevValue}, ${propertyName}`;
		}

		return propertyNameFromExpression(newParamValue);
	} else if (typeof prevValue === 'string' && isExpression(prevValue) && prevValue.length > 1) {
		return `${prevValue} ${newParamValue}`;
	} else if (prevValue && ['string', 'json'].includes(parameter.type)) {
		return prevValue === '=' || typeof prevValue === 'object'
			? `=${newParamValue}`
			: `=${prevValue} ${newParamValue}`;
	}

	return `=${newParamValue}`;
}
