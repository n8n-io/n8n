import { INodeParameters, INodeProperties } from 'n8n-workflow';

export function generatePath(root: string, path: Array<string | number>): string {
	return path.reduce((accu: string, part: string | number) => {
		if (typeof part === 'number') {
			return `${accu}[${part}]`;
		}

		if (part.includes(' ') || part.includes('.')) {
			return `${accu}["${part}"]`;
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

export function getMappedResult({
	newParamValue,
	prevParamValue,
	parameter,
}: {
	parameter: INodeProperties;
	newParamValue: string;
	prevParamValue: INodeParameters;
}): string {
	const useDataPath = !!parameter.requiresDataPath && newParamValue.startsWith('{{ $json'); // ignore when mapping from grand-parent-node
	const prevValue = parameter.type === 'resourceLocator' ? prevParamValue.value : prevParamValue;

	let updatedValue: string;
	if (useDataPath) {
		const newValue = newParamValue
			.replace('{{ $json', '')
			.replace(new RegExp('^\\.'), '')
			.replace(new RegExp('}}$'), '')
			.trim();

		if (prevValue && parameter.requiresDataPath === 'multiple') {
			if (typeof prevValue === 'string' && prevValue.trim() === '=') {
				updatedValue = newValue;
			} else {
				updatedValue = `${prevValue}, ${newValue}`;
			}
		} else {
			updatedValue = newValue;
		}
	} else if (typeof prevValue === 'string' && prevValue.startsWith('=') && prevValue.length > 1) {
		updatedValue = `${prevValue} ${newParamValue}`;
	} else if (prevValue && ['string', 'json'].includes(parameter.type)) {
		updatedValue = prevValue === '=' ? `=${newParamValue}` : `=${prevValue} ${newParamValue}`;
	} else {
		updatedValue = `=${newParamValue}`;
	}

	return updatedValue;
}
