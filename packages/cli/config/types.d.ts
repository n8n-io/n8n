/* eslint-disable @typescript-eslint/no-unused-vars */

import { IBinaryDataConfig } from '../../core/dist/src';
import { schema } from './schema';

// -----------------------------------
//          transformers
// -----------------------------------

/**
 * Transform an object (convict schema) into a union of string arrays (path segments),
 * one for every valid path in the schema object, filtered by type.
 *
 * ```ts
 * ["port", "default"] | ["queue", "bull", "redis", "port", "default"] | ["queue", "bull", "redis", "db", "default"] | ["queue", "bull", "redis", "timeoutThreshold", "default"] | etc
 * ```
 */
type GetPathSegments<Traversable, Filter> = Traversable extends Filter
	? []
	: {
			[K in ValidKeys<Traversable>]: [K, ...GetPathSegments<Traversable[K], Filter>];
	  }[ValidKeys<Traversable>];

/**
 * Transform a union of string arrays (path segments) into a union of strings (dotted paths).
 *
 * ```ts
 * "port" | "queue.bull.redis.port" | "queue.bull.redis.db" | "queue.bull.redis.timeoutThreshold" | etc
 * ```
 */
type JoinByDotting<T extends string[]> = T extends [infer F]
	? F
	: T extends [infer F, ...infer R]
	? F extends string
		? R extends string[]
			? `${F}.${JoinByDotting<R>}`
			: never
		: never
	: string;

type ToDottedPath<T> = JoinByDotting<RemoveExcess<T>>;

type CollectPathsByType<T> = ToDottedPath<GetPathSegments<typeof schema, T>>;

// -----------------------------------
//     path-to-return-type mapper
// -----------------------------------

type NumericPath = CollectPathsByType<number>;

type BooleanPath = CollectPathsByType<boolean>;

type StringLiteralArrayPath = CollectPathsByType<Readonly<string[]>>;

type StringPath = CollectPathsByType<string>;

type ConfigOptionPath = NumericPath | BooleanPath | StringPath | StringLiteralArrayPath;

type ToReturnType<T extends ConfigOptionPath | ExceptionPath> = T extends NumericPath
	? number
	: T extends BooleanPath
	? boolean
	: T extends StringLiteralArrayPath
	? StringLiteralMap[T]
	: T extends ExceptionPath
	? HandleExceptionPath<T>
	: T extends StringPath
	? string
	: unknown;

type HandleExceptionPath<T> = T extends 'binaryDataManager'
	? IBinaryDataConfig
	: T extends 'queue.bull.redis'
	? object
	: T extends 'nodes.include'
	? undefined
	: T;

// -----------------------------------
//        string literals map
// -----------------------------------

type GetPathSegmentsWithUnions<T> = T extends ReadonlyArray<infer C>
	? [C]
	: {
			[K in ValidKeys<T>]: [K, ...GetPathSegmentsWithUnions<T[K]>];
	  }[ValidKeys<T>];

type ToPathUnionPair<T extends string[]> = T extends [...infer Path, infer Union]
	? Path extends string[]
		? { path: ToDottedPath<Path>; union: Union }
		: never
	: never;

type ToStringLiteralMap<T extends { path: string; union: string }> = {
	[Path in T['path']]: Extract<T, { path: Path }>['union'];
};

type StringLiteralMap = ToStringLiteralMap<
	ToPathUnionPair<GetPathSegmentsWithUnions<typeof schema>>
>;

// -----------------------------------
//             utils
// -----------------------------------

type ValidKeys<T> = keyof T extends string
	? keyof T extends keyof NumberConstructor
		? never
		: keyof T
	: never;

type RemoveExcess<T> = T extends [...infer Path, 'format' | 'default']
	? Path extends string[]
		? Path
		: never
	: never;

// -----------------------------------
//        module augmentation
// -----------------------------------

type ExceptionPath = 'queue.bull.redis' | 'binaryDataManager' | 'nodes.include';

declare module 'convict' {
	interface Config<T> {
		getEnv<Path extends ConfigOptionPath | ExceptionPath>(path: Path): ToReturnType<Path>;
	}
}
