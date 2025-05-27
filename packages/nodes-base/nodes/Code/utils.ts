import {
	type INodeExecutionData,
	type IDataObject,
	type IExecuteFunctions,
	UserError,
} from 'n8n-workflow';

export function isObject(maybe: unknown): maybe is { [key: string]: unknown } {
	return (
		typeof maybe === 'object' && maybe !== null && !Array.isArray(maybe) && !(maybe instanceof Date)
	);
}

function isTraversable(maybe: unknown): maybe is IDataObject {
	return isObject(maybe) && typeof maybe.toJSON !== 'function' && Object.keys(maybe).length > 0;
}

/**
 * Stringify any non-standard JS objects (e.g. `Date`, `RegExp`) inside output items at any depth.
 */
export function standardizeOutput(output: IDataObject) {
	function standardizeOutputRecursive(obj: IDataObject, knownObjects = new WeakSet()): IDataObject {
		for (const [key, value] of Object.entries(obj)) {
			if (!isTraversable(value)) continue;

			if (typeof value === 'object' && value !== null) {
				if (knownObjects.has(value)) {
					// Found circular reference
					continue;
				}
				knownObjects.add(value);
			}

			obj[key] =
				value.constructor.name !== 'Object'
					? JSON.stringify(value) // Date, RegExp, etc.
					: standardizeOutputRecursive(value, knownObjects);
		}
		return obj;
	}
	standardizeOutputRecursive(output);
	return output;
}

export const addPostExecutionWarning = (
	context: IExecuteFunctions,
	returnData: INodeExecutionData[],
	inputItemsLength: number,
): void => {
	if (
		returnData.length !== inputItemsLength ||
		returnData.some((item) => item.pairedItem === undefined)
	) {
		context.addExecutionHints({
			message:
				'To make sure expressions after this node work, return the input items that produced each output item. <a target="_blank" href="https://docs.n8n.io/data/data-mapping/data-item-linking/item-linking-code-node/">More info</a>',
			location: 'outputPane',
		});
	}
};

export function checkPythonCodeImports(pythonCode: string) {
	const forbiddenImports = ['os'];

	const importLines = pythonCode.match(/^\s*(import|from)\s+[^\n]+/gm) || [];

	for (const line of importLines) {
		if (line.startsWith('import ')) {
			const modules = line
				.replace('import', '')
				.split(',')
				.map((part) => part.trim().split(' ')[0]);

			for (const mod of modules) {
				const topLevel = mod.split('.')[0];
				if (topLevel) {
					if (forbiddenImports.includes(topLevel)) {
						throw new UserError(`Forbidden import detected: ${topLevel}`);
					}
				}
			}
		} else if (line.startsWith('from ')) {
			const parts = line.split(/\s+/);
			if (parts.length >= 2) {
				const mod = parts[1].split('.')[0];
				if (mod) {
					if (forbiddenImports.includes(mod)) {
						throw new UserError(`Forbidden import detected: ${mod}`);
					}
				}
			}
		}
	}

	const dynamicImportRegex = /__import__\(\s*['"]([\w\.]+)['"]\s*\)/g;
	let match: RegExpExecArray | null;
	while ((match = dynamicImportRegex.exec(pythonCode)) !== null) {
		const topLevel = match[1].split('.')[0];
		if (topLevel) {
			if (forbiddenImports.includes(topLevel)) {
				throw new UserError(`Forbidden import detected: ${topLevel}`);
			}
		}
	}
}
