/**
 * Expands the type T (for intellisense and debugging)
 * @see https://stackoverflow.com/a/69288824/17637456
 */
export type Expand<T> = T extends (...args: infer A) => infer R
	? (...args: Expand<A>) => Expand<R>
	: T extends infer O
		? { [K in keyof O]: O[K] }
		: never;

/**
 * Recursivly expands the type T (for intellisense and debugging)
 * @see https://stackoverflow.com/a/69288824/17637456
 */
export type ExpandRecursively<T> = T extends (...args: infer A) => infer R
	? (...args: ExpandRecursively<A>) => ExpandRecursively<R>
	: T extends object
		? T extends infer O
			? { [K in keyof O]: ExpandRecursively<O[K]> }
			: never
		: T;

/**
 * Extracts an object with properties assignable to P from an object T
 * @see https://stackoverflow.com/a/71532723/17637456
 */
export type ExtractProperties<T, P> = {
	[K in keyof T as T[K] extends infer Prop ? (Prop extends P ? K : never) : never]: T[K];
};

/**
 * Extract the keys of T which are required
 * @see https://stackoverflow.com/a/55247867/17637456
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type RequiredKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K }[keyof T];

/**
 * @see https://dev.to/tmhao2005/ts-useful-advanced-types-3k5e
 */
export type RequiredProperties<T extends object, K extends keyof T = keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * @see https://dev.to/tmhao2005/ts-useful-advanced-types-3k5e
 */
export type DeepRequired<T> = {
	[K in keyof T]: Required<DeepRequired<T[K]>>;
};

/**
 * @see https://dev.to/tmhao2005/ts-useful-advanced-types-3k5e
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>;

/**
 * @see https://dev.to/tmhao2005/ts-useful-advanced-types-3k5e
 */
export type NestedKeys<T extends object> = {
	[P in keyof T & (string | number)]: T[P] extends Date
		? `${P}`
		: T[P] extends Record<string, unknown>
			? `${P}` | `${P}.${NestedKeys<T[P]>}`
			: `${P}`;
}[keyof T & (string | number)];

/**
 * @see https://dev.to/tmhao2005/ts-useful-advanced-types-3k5e
 */
export type PartialRecursive<T> = {
	[P in keyof T]?: T[P] extends (infer U)[]
		? PartialRecursive<U>[]
		: T[P] extends object | undefined
			? PartialRecursive<T[P]>
			: T[P];
};

/**
 * Get the keys of a union of objects
 * @see https://stackoverflow.com/a/65805753/17637456
 */
export type UnionKeys<T> = T extends T ? keyof T : never;

type StrictUnionHelper<T, TAll> = T extends unknown
	? T & Partial<Record<Exclude<UnionKeys<TAll>, keyof T>, never>>
	: never;

/**
 * @see https://stackoverflow.com/a/65805753/17637456
 */
export type StrictUnion<T> = Expand<StrictUnionHelper<T, T>>;

// Tuple and array manipulation

/**
 * Empty
 */
export type Empty = [];

/**
 * Removes the first element of T and shifts
 */
export type Shift<T extends unknown[]> = T extends [unknown, ...infer Rest] ? Rest : never;

/**
 * Gets the first element of T
 */
export type First<T extends unknown[]> = T extends [infer F, ...unknown[]] ? F : never;

/**
 * Inserts V into T at the start of T
 */
export type Unshift<T extends unknown[], V> = [V, ...T];

/**
 * Removes the last element of T
 */
export type Pop<T extends unknown[]> = T extends [...infer _, unknown] ? _ : never;

/**
 * Gets the last element of T
 */
export type Last<T extends unknown[]> = T extends [...unknown[], infer Last] ? Last : never;

/**
 * Appends V to T
 */
export type Push<T extends unknown[], V> = [...T, V];

/**
 * Concats A and B
 */
export type Concat<A extends unknown[], B extends unknown[]> = Empty extends B ? A : Concat<Unshift<A, 0>, Shift<B>>;

/**
 * Extracts from A what is not B
 *
 * @remarks
 * It does not remove duplicates (so Remove\<[0, 0, 0], [0, 0]\> yields [0]). This is intended and necessary behavior.
 */
export type Remove<A extends unknown[], B extends unknown[]> = Empty extends B ? A : Remove<Shift<A>, Shift<B>>;

/**
 * The length of T
 */
export type Length<T extends { length: number }> = T['length'];

type _FromLength<N extends number, R extends unknown[] = Empty> =
	Length<R> extends N ? R : _FromLength<N, Unshift<R, 0>>;

/**
 * Creates a tuple of length N
 */
export type FromLength<N extends number> = _FromLength<N>;

// compile-time math

/**
 * Increments N
 */
export type Increment<N extends number> = Length<Unshift<_FromLength<N>, 0>>;

/**
 * Decrements N
 */
export type Decrement<N extends number> = Length<Shift<_FromLength<N>>>;

/**
 * Gets the sum of A and B
 */
export type Add<A extends number, B extends number> = Length<Concat<_FromLength<A>, _FromLength<B>>>;

/**
 * Subtracts B from A
 */
export type Subtract<A extends number, B extends number> = Length<Remove<_FromLength<A>, _FromLength<B>>>;

/**
 * Gets the type of an array's members
 */
export type Member<T, D = null> = D extends 0
	? T
	: T extends (infer U)[]
		? Member<U, D extends number ? Decrement<D> : null>
		: T;

/**
 * Flattens an array
 */
export type FlattenArray<A extends unknown[], D = null> = A extends (infer U)[]
	? Member<Exclude<U, A>, D>[]
	: A extends unknown[]
		? { [K in keyof A]: Member<A[K], D> }
		: A;

/**
 * Whether T is a tuple
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type IsTuple<T> = T extends [] ? false : T extends [infer _Head, ...infer _Rest] ? true : false;

/**
 * Flattens a tuple
 */
export type FlattenTuple<A extends unknown[]> = A extends [infer U, ...infer Rest]
	? U extends unknown[]
		? [...U, ...FlattenTuple<Rest>]
		: [U, ...FlattenTuple<Rest>]
	: [];

/**
 * Flattens an array or tuple
 */
export type Flatten<A extends unknown[]> = IsTuple<A> extends true ? FlattenTuple<A> : FlattenArray<A>;

type _Tuple<T, N extends number, R extends unknown[] = Empty> = R['length'] extends N ? R : _Tuple<T, N, [T, ...R]>;

/**
 * Creates a tuple of T with length N
 */
export type Tuple<T, N extends number> = _Tuple<T, N>;

/**
 * Makes all members of the tuple T optional
 */
export type OptionalTuple<T extends unknown[]> = T extends [infer Head, ...infer Tail]
	? [Head?, ...OptionalTuple<Tail>]
	: T;

/**
 * Keys of a Map
 */
export type MapKeys<T> = T extends Map<infer K, any> ? K : never;

export type ClassLike<Instance = any> = abstract new (...args: any[]) => Instance;

export type Concrete<T extends ClassLike> = Pick<T, keyof T> & (new (...args: any[]) => InstanceType<T>);

/**
 * Converts a union to an intersection
 * @see https://stackoverflow.com/a/55128956/17637456
 */
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/**
 * Gets the last element of a union
 * @see https://stackoverflow.com/a/55128956/17637456
 */
export type LastOfUnion<T> = UnionToIntersection<T extends any ? () => T : never> extends () => infer R ? R : never;

/**
 * Converts a union to a tuple
 * @see https://stackoverflow.com/a/55128956/17637456
 */
export type UnionToTuple<T, L = LastOfUnion<T>, N = [T] extends [never] ? true : false> = true extends N
	? []
	: Push<UnionToTuple<Exclude<T, L>>, L>;

/**
 * Makes properties with keys assignable to K in T required
 * @see https://stackoverflow.com/a/69328045/17637456
 */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/**
 * Makes properties with keys assignable to K in T optional
 */
export type WithOptional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

/**
 * Nothing in T
 */
export type Never<T> = { [K in keyof T]?: never };

/**
 * All of the properties in T or none of them
 */
export type AllOrNone<T> = T | Never<T>;
