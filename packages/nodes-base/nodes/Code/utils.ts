import type { INodeExecutionData, IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { VMScript } from 'vm2';

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

const PREPARE_STACKTRACE = `
Error.prepareStackTrace = (err, structuredStackTrace) => {
	return "Error: " + err + "\\n" + structuredStackTrace
		.filter(callSite => callSite.getLineNumber())
		.map(callSite => {
			return "	at Code:" + callSite.getLineNumber() + ":" + callSite.getColumnNumber()
		})
		.join("\\n");
};
`;

export function generateScript(jsCode: string) {
	return new VMScript(
		`module.exports = async function() {${jsCode}\n}() ${PREPARE_STACKTRACE}`,
		'Code',
	);
}

export function generateSortingScript(jsCode: string) {
	return new VMScript(
		`module.exports = items.sort((a, b) => { ${jsCode} }) ${PREPARE_STACKTRACE}`,
		'Code',
	);
}
