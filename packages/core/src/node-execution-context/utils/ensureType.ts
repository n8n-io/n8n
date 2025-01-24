import type { EnsureTypeOptions } from 'n8n-workflow';
import { ExpressionError } from 'n8n-workflow';

export function ensureType(
	toType: EnsureTypeOptions,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	parameterValue: any,
	parameterName: string,
	errorOptions?: { itemIndex?: number; runIndex?: number; nodeCause?: string },
): string | number | boolean | object {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	let returnData = parameterValue;

	if (returnData === null) {
		throw new ExpressionError(`Parameter '${parameterName}' must not be null`, errorOptions);
	}

	if (returnData === undefined) {
		throw new ExpressionError(
			`Parameter '${parameterName}' could not be 'undefined'`,
			errorOptions,
		);
	}

	if (['object', 'array', 'json'].includes(toType)) {
		if (typeof returnData !== 'object') {
			// if value is not an object and is string try to parse it, else throw an error
			if (typeof returnData === 'string' && returnData.length) {
				try {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					const parsedValue = JSON.parse(returnData);
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					returnData = parsedValue;
				} catch (error) {
					throw new ExpressionError(`Parameter '${parameterName}' could not be parsed`, {
						...errorOptions,
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
						description: error.message,
					});
				}
			} else {
				throw new ExpressionError(
					`Parameter '${parameterName}' must be an ${toType}, but we got '${String(parameterValue)}'`,
					errorOptions,
				);
			}
		} else if (toType === 'json') {
			// value is an object, make sure it is valid JSON
			try {
				JSON.stringify(returnData);
			} catch (error) {
				throw new ExpressionError(`Parameter '${parameterName}' is not valid JSON`, {
					...errorOptions,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
					description: error.message,
				});
			}
		}

		if (toType === 'array' && !Array.isArray(returnData)) {
			// value is not an array, but has to be
			throw new ExpressionError(
				`Parameter '${parameterName}' must be an array, but we got object`,
				errorOptions,
			);
		}
	}

	try {
		if (toType === 'string') {
			if (typeof returnData === 'object') {
				returnData = JSON.stringify(returnData);
			} else {
				returnData = String(returnData);
			}
		}

		if (toType === 'number') {
			returnData = Number(returnData);
			if (Number.isNaN(returnData)) {
				throw new ExpressionError(
					`Parameter '${parameterName}' must be a number, but we got '${parameterValue}'`,
					errorOptions,
				);
			}
		}

		if (toType === 'boolean') {
			returnData = Boolean(returnData);
		}
	} catch (error) {
		if (error instanceof ExpressionError) throw error;

		throw new ExpressionError(`Parameter '${parameterName}' could not be converted to ${toType}`, {
			...errorOptions,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			description: error.message,
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return returnData;
}
