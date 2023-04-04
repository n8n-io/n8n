import { INodeProperties, isResourceLocatorValue, NodeParameterValueType } from 'n8n-workflow';

export function generatePath(root: string, path: Array<string | number>): string {
	return path.reduce((accu: string, part: string | number) => {
		if (typeof part === 'number') {
			return `${accu}[${part}]`;
		}

		const special = ['-', ' ', '.', "'", '"', '`', '[', ']', '{', '}', '(', ')', ':', ',', '?'];
		const hasSpecial = !!special.find((s) => part.includes(s));
		if (hasSpecial) {
			const escaped = part.replaceAll("'", "\\'");
			return `${accu}['${escaped}']`;
		}

		return `${accu}.${part}`;
	}, root);
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
	const root = distanceFromActive === 1 ? '$json' : generatePath('$node', [nodeName, 'json']);

	if (typeof path === 'string') {
		return `{{ ${root}${path} }}`;
	}

	return `{{ ${generatePath(root, path)} }}`;
}

export function getMappedResult(
	parameter: INodeProperties,
	newParamValue: string,
	prevParamValue: NodeParameterValueType,
): string {
	const useDataPath = !!parameter.requiresDataPath && newParamValue.startsWith('{{ $json'); // ignore when mapping from grand-parent-node
	const prevValue =
		parameter.type === 'resourceLocator' && isResourceLocatorValue(prevParamValue)
			? prevParamValue.value
			: prevParamValue;

	if (useDataPath) {
		const newValue = newParamValue
			.replace('{{ $json', '')
			.replace(new RegExp('^\\.'), '')
			.replace(new RegExp('}}$'), '')
			.trim();

		if (prevValue && parameter.requiresDataPath === 'multiple') {
			if (typeof prevValue === 'string' && prevValue.trim() === '=') {
				return newValue;
			} else {
				return `${prevValue}, ${newValue}`;
			}
		} else {
			return newValue;
		}
	} else if (typeof prevValue === 'string' && prevValue.startsWith('=') && prevValue.length > 1) {
		return `${prevValue} ${newParamValue}`;
	} else if (prevValue && ['string', 'json'].includes(parameter.type)) {
		return prevValue === '=' ? `=${newParamValue}` : `=${prevValue} ${newParamValue}`;
	}

	return `=${newParamValue}`;
}
