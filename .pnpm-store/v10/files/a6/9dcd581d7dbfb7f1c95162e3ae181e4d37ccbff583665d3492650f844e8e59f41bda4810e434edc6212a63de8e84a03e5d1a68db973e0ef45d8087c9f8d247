export function typedEntries<T extends { [s: string]: T[keyof T] } | ArrayLike<T[keyof T]>>(
	obj: T
): [keyof T, T[keyof T]][] {
	return Object.entries(obj) as [keyof T, T[keyof T]][];
}
