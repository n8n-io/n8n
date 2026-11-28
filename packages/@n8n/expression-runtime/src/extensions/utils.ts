import { DateTime } from 'luxon';

import { ExpressionExtensionError } from './expression-extension-error';

// Utility functions and type guards for expression extensions

export const convertToDateTime = (value: string | Date | DateTime): DateTime | undefined => {
	let converted: DateTime | undefined;

	if (typeof value === 'string') {
		// Date-only strings (e.g. '2023-06-16') parsed with new Date() become
		// UTC midnight, which is the previous day west of UTC. Luxon parses them
		// as local midnight, matching `.toDateTime()` semantics.
		// Date-only strings parsed with new Date() become UTC midnight; Luxon
		// parses them as local midnight, matching `.toDateTime()` semantics.
		// Full timestamps keep the existing Date parsing to preserve their zone.
		if (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(value)) {
			converted = DateTime.fromISO(value);
		} else {
			converted = DateTime.fromJSDate(new Date(value));
		}
		if (converted.invalidReason !== null) {
			return;
		}
	} else if (value instanceof Date) {
		converted = DateTime.fromJSDate(value);
	} else if (DateTime.isDateTime(value)) {
		converted = value;
	}
	return converted;
};

// Define an own data field rather than assigning through an inherited setter.
export function defineField(
	target: Record<string, unknown>,
	key: PropertyKey,
	value: unknown,
): void {
	Object.defineProperty(target, key, {
		value,
		writable: true,
		enumerable: true,
		configurable: true,
	});
}

export function checkIfValueDefinedOrThrow<T>(value: T, functionName: string): void {
	if (value === undefined || value === null) {
		throw new ExpressionExtensionError(`${functionName} can't be used on ${String(value)} value`, {
			description: `To ignore this error, add a ? to the variable before this function, e.g. my_var?.${functionName}`,
		});
	}
}
