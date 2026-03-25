
/**
 * A single property handler for FindOptionsRelations.
 */
export type FindOptionsRelationsProperty<Property> = Property extends Promise<infer I> ? FindOptionsRelationsProperty<NonNullable<I>> | boolean : Property extends Array<infer I> ? FindOptionsRelationsProperty<NonNullable<I>> | boolean : Property extends string ? never : Property extends number ? never : Property extends boolean ? never : Property extends Function ? never : Property extends Buffer ? never : Property extends Date ? never : Property extends object ? FindOptionsRelations<Property> | boolean : boolean;
/**
 * Relations find options.
 */
export type FindOptionsRelations<Entity> = {
    [P in keyof Entity]?: P extends "toString" ? unknown : FindOptionsRelationsProperty<NonNullable<Entity[P]>>;
};
/**
 * Relation names to be selected by "relation" defined as string.
 * Old relation mechanism in TypeORM.
 *
 * @deprecated will be removed in the next version, use FindOptionsRelation type notation instead
 */
export type FindOptionsRelationByString = string[];
