/* eslint-disable @typescript-eslint/no-explicit-any */
export function isArrayOfArray<A>(item: A[] | A[][]): item is A[][] {
	return Array.isArray(item[0]);
}

export function get<T>(
	object: Record<string, any> | undefined,
	path: Array<string | number> | string,
	defaultValue?: T,
): T | undefined {
	if (typeof path === 'string') {
		path = path.split('.').map((key) => {
			const numKey = Number(key);
			return Number.isNaN(numKey) ? key : numKey;
		});
	}

	let result: any = object;

	for (const key of path) {
		if (result === undefined || result === null) {
			return defaultValue;
		}

		result = result[key];
	}

	return result !== undefined ? result : defaultValue;
}
