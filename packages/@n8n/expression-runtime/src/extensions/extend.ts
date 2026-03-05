import { DateTime } from 'luxon';

import { arrayExtensions } from './array-extensions';
import { booleanExtensions } from './boolean-extensions';
import { dateExtensions } from './date-extensions';
import type { ExtensionMap } from './extensions';
import { ExpressionExtensionError } from './expression-extension-error';
import { numberExtensions } from './number-extensions';
import { objectExtensions } from './object-extensions';
import { stringExtensions } from './string-extensions';
import { checkIfValueDefinedOrThrow } from './utils';

function isEmpty(value: unknown) {
	return value === null || value === undefined || !value;
}

function isNotEmpty(value: unknown) {
	return !isEmpty(value);
}

export const EXTENSION_OBJECTS: ExtensionMap[] = [
	arrayExtensions,
	dateExtensions,
	numberExtensions,
	objectExtensions,
	stringExtensions,
	booleanExtensions,
];

// eslint-disable-next-line @typescript-eslint/no-restricted-types
const genericExtensions: Record<string, Function> = {
	isEmpty,
	isNotEmpty,
};

function isDate(input: unknown): boolean {
	if (typeof input !== 'string' || !input.length) {
		return false;
	}
	if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(input)) {
		return false;
	}
	const d = new Date(input);
	return d instanceof Date && !isNaN(d.valueOf()) && d.toISOString() === input;
}

interface FoundFunction {
	type: 'native' | 'extended';
	// eslint-disable-next-line @typescript-eslint/no-restricted-types
	function: Function;
}

function findExtendedFunction(input: unknown, functionName: string): FoundFunction | undefined {
	// eslint-disable-next-line @typescript-eslint/no-restricted-types
	let foundFunction: Function | undefined;
	if (Array.isArray(input)) {
		foundFunction = arrayExtensions.functions[functionName];
	} else if (isDate(input) && functionName !== 'toDate' && functionName !== 'toDateTime') {
		// If it's a string date (from $json), convert it to a Date object,
		// unless that function is `toDate`, since `toDate` does something
		// very different on date objects
		input = new Date(input as string);
		foundFunction = dateExtensions.functions[functionName];
	} else if (typeof input === 'string') {
		foundFunction = stringExtensions.functions[functionName];
	} else if (typeof input === 'number') {
		foundFunction = numberExtensions.functions[functionName];
	} else if (input && (DateTime.isDateTime(input) || input instanceof Date)) {
		foundFunction = dateExtensions.functions[functionName];
	} else if (input !== null && typeof input === 'object') {
		foundFunction = objectExtensions.functions[functionName];
	} else if (typeof input === 'boolean') {
		foundFunction = booleanExtensions.functions[functionName];
	}

	// Look for generic or builtin
	if (!foundFunction) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const inputAny: any = input;
		// This is likely a builtin we're implementing for another type
		// (e.g. toLocaleString). We'll return that instead
		if (inputAny && functionName && typeof inputAny[functionName] === 'function') {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			return { type: 'native', function: inputAny[functionName] };
		}

		// Use a generic version if available
		foundFunction = genericExtensions[functionName];
	}

	if (!foundFunction) {
		return undefined;
	}

	return { type: 'extended', function: foundFunction };
}

/**
 * Extender function injected by expression extension plugin to allow calls to extensions.
 *
 * ```ts
 * extend(input, "functionName", [...args]);
 * ```
 */
export function extend(input: unknown, functionName: string, args: unknown[]) {
	const foundFunction = findExtendedFunction(input, functionName);

	// No type specific or generic function found. Check to see if
	// any types have a function with that name. Then throw an error
	// letting the user know the available types.
	if (!foundFunction) {
		checkIfValueDefinedOrThrow(input, functionName);
		const haveFunction = EXTENSION_OBJECTS.filter((v) => functionName in v.functions);
		if (!haveFunction.length) {
			// This shouldn't really be possible but we should cover it anyway
			throw new ExpressionExtensionError(`Unknown expression function: ${functionName}`);
		}

		if (haveFunction.length > 1) {
			const lastType = `"${haveFunction.pop()!.typeName}"`;
			const typeNames = `${haveFunction.map((v) => `"${v.typeName}"`).join(', ')}, and ${lastType}`;
			throw new ExpressionExtensionError(
				`${functionName}() is only callable on types ${typeNames}`,
			);
		} else {
			throw new ExpressionExtensionError(
				`${functionName}() is only callable on type "${haveFunction[0].typeName}"`,
			);
		}
	}

	if (foundFunction.type === 'native') {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return foundFunction.function.apply(input, args);
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return foundFunction.function(input, args);
}

export function extendOptional(
	input: unknown,
	functionName: string,
	// eslint-disable-next-line @typescript-eslint/no-restricted-types
): Function | undefined {
	const foundFunction = findExtendedFunction(input, functionName);

	if (!foundFunction) {
		return undefined;
	}

	if (foundFunction.type === 'native') {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return foundFunction.function.bind(input);
	}

	return (...args: unknown[]) => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return foundFunction.function(input, args);
	};
}
