import { FindOperator } from './FindOperator';

import { EqualOperator } from './EqualOperator';

/** Decrementing depth counter: RecursionDepth[N] resolves to N - 1. */
type RecursionDepth = [never, 0, 1, 2, 3, 4];

/**
 * A single property handler for FindOptionsWhere.
 *
 * The reason why we have both "PropertyToBeNarrowed" and "Property" is that Union is narrowed down when extends is used.
 * It means the result of FindOptionsWhereProperty<1 | 2> doesn't include FindOperator<1 | 2> but FindOperator<1> | FindOperator<2>.
 * So we keep the original Union as Original and pass it to the FindOperator too. Original remains Union as extends is not used for it.
 *
 * Recursion is depth-capped: entity graphs that mix recursive relations with
 * recursive JSON column types exceed TypeScript 7's instantiation limits.
 * Beyond the cap the type degrades to `unknown` (deeper levels go unchecked).
 */
export type FindOptionsWhereProperty<
	PropertyToBeNarrowed,
	Property = PropertyToBeNarrowed,
	Depth extends number = 5,
> = [Depth] extends [never]
	? unknown
	: PropertyToBeNarrowed extends Promise<infer I>
		? FindOptionsWhereProperty<NonNullable<I>, NonNullable<I>, RecursionDepth[Depth]>
		: PropertyToBeNarrowed extends Array<infer I>
			? FindOptionsWhereProperty<NonNullable<I>, NonNullable<I>, RecursionDepth[Depth]>
			: PropertyToBeNarrowed extends Function
				? never
				: PropertyToBeNarrowed extends Buffer
					? Property | FindOperator<Property>
					: PropertyToBeNarrowed extends Date
						? Property | FindOperator<Property>
						: PropertyToBeNarrowed extends string
							? Property | FindOperator<Property>
							: PropertyToBeNarrowed extends number
								? Property | FindOperator<Property>
								: PropertyToBeNarrowed extends boolean
									? Property | FindOperator<Property>
									: PropertyToBeNarrowed extends object
										?
												| FindOptionsWhere<Property, RecursionDepth[Depth]>
												| FindOptionsWhere<Property, RecursionDepth[Depth]>[]
												| EqualOperator<Property>
												| FindOperator<any>
												| boolean
												| Property
										: Property | FindOperator<Property>;

/**
 * Used for find operations.
 */
export type FindOptionsWhere<Entity, Depth extends number = 5> = [Depth] extends [never]
	? unknown
	: {
			[P in keyof Entity]?: P extends 'toString'
				? unknown
				: FindOptionsWhereProperty<NonNullable<Entity[P]>, NonNullable<Entity[P]>, Depth>;
		};
