export const idStringifier = {
	from: (value: number): string | number => (value ? value.toString() : value),
	to: (value: string): number | string => (value ? Number(value) : value),
};
