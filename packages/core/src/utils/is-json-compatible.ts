/**
 * This function checks if a value is JSON-compatible.
 * @param value
 * @returns boolean
 */
export function isJsonCompatible(value: unknown): {
	isValid: boolean;
	errorPath?: string;
	errorMessage?: string;
} {
	const seen = new WeakSet();

	const check = (
		val: unknown,
		path = 'value',
	): { isValid: boolean; errorPath?: string; errorMessage?: string } => {
		const type = typeof val;

		if (
			val === null ||
			type === 'boolean' ||
			type === 'number' ||
			type === 'string' ||
			type === 'undefined'
		) {
			return { isValid: true };
		}

		if (type === 'function' || type === 'symbol' || type === 'bigint') {
			return {
				isValid: false,
				errorPath: path,
				errorMessage: `is a ${type}, which is not JSON-compatible`,
			};
		}

		if (Array.isArray(val)) {
			if (seen.has(val)) {
				return {
					isValid: false,
					errorPath: path,
					errorMessage: 'contains a circular reference',
				};
			}
			seen.add(val);
			for (let i = 0; i < val.length; i++) {
				const result = check(val[i], `${path}[${i}]`);
				if (!result.isValid) return result;
			}
			return { isValid: true };
		}

		if (type === 'object') {
			if (seen.has(val as object)) {
				return {
					isValid: false,
					errorPath: path,
					errorMessage: 'contains a circular reference',
				};
			}
			seen.add(val as object);

			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const proto = Object.getPrototypeOf(val);
			if (proto !== Object.prototype && proto !== null) {
				return {
					isValid: false,
					errorPath: path,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					errorMessage: `has non-plain prototype (${proto?.constructor?.name || 'unknown'})`,
				};
			}
			for (const [key, subVal] of Object.entries(val as Record<string, unknown>)) {
				const result = check(subVal, `${path}.${key}`);
				if (!result.isValid) return result;
			}
			return { isValid: true };
		}

		return {
			isValid: false,
			errorPath: path,
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			errorMessage: `is of unknown type (${type}) with value ${JSON.stringify(val)}`,
		};
	};

	return check(value);
}
