const check = (
	val: unknown,
	path = 'value',
	stack: Set<unknown> = new Set(),
): { isValid: true } | { isValid: false; errorPath: string; errorMessage: string } => {
	const type = typeof val;

	if (val === null || type === 'boolean' || type === 'string') {
		return { isValid: true };
	}

	if (type === 'number') {
		if (!Number.isFinite(val)) {
			return {
				isValid: false,
				errorPath: path,
				errorMessage: `is ${val as number}, which is not JSON-compatible`,
			};
		}
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
		if (stack.has(val)) {
			return {
				isValid: false,
				errorPath: path,
				errorMessage: 'contains a circular reference',
			};
		}
		stack.add(val);
		for (let i = 0; i < val.length; i++) {
			const result = check(val[i], `${path}[${i}]`, stack);
			if (!result.isValid) return result;
		}
		stack.delete(val);
		return { isValid: true };
	}

	if (type === 'object') {
		if (stack.has(val)) {
			return {
				isValid: false,
				errorPath: path,
				errorMessage: 'contains a circular reference',
			};
		}
		stack.add(val);

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
		for (const key of Reflect.ownKeys(val as object)) {
			if (typeof key === 'symbol') {
				return {
					isValid: false,
					errorPath: `${path}.${key.toString()}`,
					errorMessage: `has a symbol key (${String(key)}), which is not JSON-compatible`,
				};
			}

			const subVal = (val as Record<string, unknown>)[key];
			const result = check(subVal, `${path}.${key}`, stack);
			if (!result.isValid) return result;
		}
		stack.delete(val);
		return { isValid: true };
	}

	return {
		isValid: false,
		errorPath: path,
		errorMessage: `is of unknown type (${type}) with value ${JSON.stringify(val)}`,
	};
};

/**
 * This function checks if a value matches JSON data type restrictions.
 * @param value
 * @returns boolean
 */
export function isJsonCompatible(value: unknown):
	| { isValid: true }
	| {
			isValid: false;
			errorPath: string;
			errorMessage: string;
	  } {
	return check(value);
}
