export const splitByComma = (str: string) => {
	return str
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s);
};
