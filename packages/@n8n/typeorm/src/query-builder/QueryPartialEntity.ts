import { ObjectLiteral } from '../common/ObjectLiteral';

/**
 * Make all properties in T optional
 */
export type QueryPartialEntity<T> = {
	[P in keyof T]?: T[P] | (() => string);
};

/**
 * Make all properties in T optional. Deep version.
 *
 * Recursion is depth-capped (in addition to the `Seen` cycle-breaker): entity
 * graphs that mix recursive relations with recursive JSON column types (e.g.
 * workflow nodes' parameter values) exceed TypeScript 7's instantiation
 * limits. Beyond the cap the type degrades to `unknown`, which accepts any
 * value — deeper levels are simply no longer checked.
 */
export type QueryDeepPartialEntity<T> = _QueryDeepPartialEntity<
	ObjectLiteral extends T ? unknown : T,
	never,
	5
>;

/** Decrementing depth counter: RecursionDepth[N] resolves to N - 1. */
type RecursionDepth = [never, 0, 1, 2, 3, 4];

type _QueryDeepPartialEntity<Entity, Seen = never, Depth extends number = 5> = [Depth] extends [
	never,
]
	? unknown
	: {
			[Property in keyof Entity]?:
				| (Entity[Property] extends Seen
						? Entity[Property] // break cycle
						: Entity[Property] extends Array<infer ArrayItem>
							? Array<
									_QueryDeepPartialEntity<ArrayItem, Seen | Entity[Property], RecursionDepth[Depth]>
								>
							: Entity[Property] extends ReadonlyArray<infer ArrayItem>
								? ReadonlyArray<
										_QueryDeepPartialEntity<
											ArrayItem,
											Seen | Entity[Property],
											RecursionDepth[Depth]
										>
									>
								: _QueryDeepPartialEntity<
										Entity[Property],
										Seen | Entity[Property],
										RecursionDepth[Depth]
									>)
				| (() => string);
		};
