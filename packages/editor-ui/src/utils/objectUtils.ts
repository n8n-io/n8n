export const valuesToString = <T extends Record<string, any>>(obj: T): Record<string, string> => {
	const newObj: Record<string, string> = {};

	for (const [key, value] of Object.entries(obj)) {
		newObj[key] = value === null ? 'null' : value?.toString() ?? '';
	}

	return newObj;
};
