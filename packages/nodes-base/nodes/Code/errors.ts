export const END_SCRIPT_ERRORS = {
	ALL_ITEMS: {
		NO_OUTPUT:
			'Expected a return value but received none. Return an array of objects with a `json` property pointing to an object.',
		OUTPUT_OBJECT_INSTEAD_OF_ARRAY:
			'Expected the return value to be an array of objects with a `json` property. To return a single object, use mode "Run Once for Each Item"',
		OUTPUT_NO_JSON: 'Expected all return values to be objects with a `json` property.',
		OUTPUT_JSON_NOT_OBJECT: 'Expected every `json` property to point to an object.',
		OUTPUT_BINARY_NOT_OBJECT: 'Expected every `binary` property to point to an object.',
	},
	EACH_ITEM: {
		NO_OUTPUT:
			'Expected a return value but received none. Return an object with a `json` property pointing to an object.',
		OUTPUT_ARRAY_INSTEAD_OF_OBJECT:
			'Expected the return value to be an object with a `json` property. To return an array of objects, use mode "Run Once for All Items"',
		OUTPUT_NO_JSON: 'Expected return value to be an object with a `json` property.',
		OUTPUT_JSON_NOT_OBJECT: 'Expected return value to be an object.',
		OUTPUT_BINARY_NOT_OBJECT: 'Expected every `binary` property to point to an object.',
	},
};

export class EndScriptError extends Error {
	constructor(jsCode: string, errorMessage: string) {
		super();
		this.message = this.toEndScriptErrorMessage(jsCode, errorMessage);
	}

	private toEndScriptErrorMessage(jsCode: string, errorMessage: string) {
		const allLines = jsCode.trim().split('\n');
		const finalLineText = allLines[allLines.length - 1];
		const finalLineNumber = allLines.length;

		return [errorMessage, `Final line: '${finalLineText}'`, `[Line ${finalLineNumber}]`].join(' ');
	}
}

export class MidScriptError extends Error {
	constructor(errorStack: string) {
		super();
		this.message = this.toMidScriptErrorMessage(errorStack);
	}

	private toMidScriptErrorMessage(errorStack: string) {
		const stackLines = errorStack.split('\n');

		if (stackLines.length === 0) {
			throw new Error(`Unknown error: ${errorStack}`);
		}

		const [errorHeader, firstStackLine] = stackLines;

		const match = firstStackLine.match(/Code:(?<lineNumber>\d+):/);

		if (!errorHeader || !match?.groups) {
			throw new Error(`Unknown error: ${errorStack}`);
		}

		const { lineNumber } = match.groups;

		return [errorHeader, `[Line ${lineNumber}]`].join(' ');
	}
}
