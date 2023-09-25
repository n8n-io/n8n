export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type TupleToUnion<T extends readonly unknown[]> = T[number];
export type HasAtLeastOneKey<T, K extends keyof T = keyof T> = K extends any
	? Omit<T, K> & Record<K, NonNullable<T[K]>>
	: never;
