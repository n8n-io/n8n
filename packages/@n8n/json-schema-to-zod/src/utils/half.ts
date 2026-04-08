export const half = <T>(arr: T[]): [T[], T[]] => {
	return [arr.slice(0, arr.length / 2), arr.slice(arr.length / 2)];
};
