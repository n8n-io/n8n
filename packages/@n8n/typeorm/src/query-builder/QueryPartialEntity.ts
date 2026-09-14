import type { ObjectLiteral } from '../common/ObjectLiteral';

/**
 * Make all properties in T optional
 */
export type QueryPartialEntity<T> = {
	[P in keyof T]?: T[P] | (() => string);
};

type _QueryDeepPartialEntityDecr = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

type _QueryDeepPartialEntity<T, Depth extends number = 10> = [Depth] extends [never]
	? T
	: {
			[P in keyof T]?:
				| (T[P] extends Array<infer U>
						? Array<_QueryDeepPartialEntity<U, _QueryDeepPartialEntityDecr[Depth]>>
						: T[P] extends ReadonlyArray<infer U>
							? ReadonlyArray<_QueryDeepPartialEntity<U, _QueryDeepPartialEntityDecr[Depth]>>
							: _QueryDeepPartialEntity<T[P], _QueryDeepPartialEntityDecr[Depth]>)
				| (() => string);
		};

/**
 * Make all properties in T optional. Deep version.
 *
 * Recursion is bounded by a fixed depth budget instead of a growing `Seen`
 * union (expensive for the checker) or unbounded recursion (trips the
 * compiler's own depth limiter with TS2589 on deep payloads such as INode[]).
 * At the depth floor the full `T` is returned so deep writes stay assignable.
 */
export type QueryDeepPartialEntity<T> = _QueryDeepPartialEntity<
	ObjectLiteral extends T ? unknown : T
>;
