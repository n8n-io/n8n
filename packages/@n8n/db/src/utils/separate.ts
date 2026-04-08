export const separate = <T>(array: T[], test: (element: T) => boolean) => {
	const pass: T[] = [];
	const fail: T[] = [];

	array.forEach((i) => (test(i) ? pass : fail).push(i));

	return [pass, fail];
};
