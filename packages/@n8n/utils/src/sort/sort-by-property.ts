export const sortByProperty = <T>(
	property: keyof T,
	arr: T[],
	order: 'asc' | 'desc' = 'asc',
): T[] =>
	arr.sort((a, b) => {
		const result = String(a[property]).localeCompare(String(b[property]), undefined, {
			numeric: true,
			sensitivity: 'base',
		});
		return order === 'asc' ? result : -result;
	});
