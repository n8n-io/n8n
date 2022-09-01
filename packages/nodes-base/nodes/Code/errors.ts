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

		return [
			errorMessage,
			finalLineText ? `Final line: '${finalLineText}'` : '',
			`[Line ${finalLineNumber}]`,
		].join(' ');
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
			throw new Error(`Unknown error: ${errorStack.slice(100) + '...'}`);
		}

		let messageLine = stackLines.find((line) => line.includes('Error:'));
		const lineNumberLine = stackLines.find((line) => line.includes('Code:'));

		if (!messageLine || !lineNumberLine) {
			throw new Error(`Unknown error: ${errorStack.slice(100) + '...'}`);
		}

		if (messageLine.startsWith('TypeError: Cannot set properties of undefined')) {
			const match = messageLine.match(/\(setting (?<setValue>['\w]+)\)/);

			if (match?.groups?.setValue) {
				messageLine = [
					messageLine,
					`Check the value on which you are trying to set ${match.groups.setValue}.`,
				].join('. ');
			}
		}

		if (messageLine.startsWith('TypeError: Cannot read properties of undefined')) {
			const match = messageLine.match(/\(reading (?<getValue>['\w]+)\)/);

			if (match?.groups?.getValue) {
				messageLine = [
					messageLine,
					`Check the value from which you are trying to read ${match.groups.getValue}.`,
				].join('. ');
			}
		}

		if (messageLine.startsWith('SyntaxError:')) {
			messageLine = [
				messageLine,
				'Your code cannot be parsed because it contains a syntax error.',
			].join('. ');
		}

		const errorLineNumberMatch = lineNumberLine.match(/Code:(?<lineNumber>\d+)/);

		if (!errorLineNumberMatch?.groups?.lineNumber) return messageLine;

		const { lineNumber } = errorLineNumberMatch.groups;

		return [messageLine, `[Line ${lineNumber}]`].join(' ');

		// // regular error - message and line in predictable order

		// let [regularErrorMessage, regularErrorLine] = stackLines;

		// const match = regularErrorLine.match(/Code:(?<lineNumber>\d+):/);

		// if (match?.groups?.lineNumber) {
		// 	const { lineNumber } = match.groups;

		// if (regularErrorMessage.startsWith('TypeError: Cannot set properties of undefined')) {
		// 	console.log('a', regularErrorLine);
		// 	const match = regularErrorLine.match(/\(setting (?<setValue>['\w]+)\)/);

		// 	if (match?.groups?.setValue) {
		// 		console.log('b');
		// 		const { setValue } = match.groups;
		// 		regularErrorMessage += `The value on which are setting ${setValue} is undefined.`;
		// 	}
		// }

		// 	return [regularErrorMessage, `[Line ${lineNumber}]`].join(' ');
		// }

		// // syntax error - message and line in unpredictable order

		// const syntaxErrorMessage = stackLines.find((line) => line.includes('SyntaxError'));
		// const syntaxErrorLine = stackLines.find((line) => line.includes('Code'));

		// if (syntaxErrorMessage && syntaxErrorLine) {
		// 	const match = syntaxErrorLine.match(/Code:(?<lineNumber>\d+)/); // no final colon

		// 	if (match?.groups?.lineNumber) {
		// 		const { lineNumber } = match.groups;

		// 		return [syntaxErrorMessage, `[Line ${lineNumber}]`].join(' ');
		// 	}
		// }

		// throw new Error(`Unknown error: ${errorStack}`);
	}
}
