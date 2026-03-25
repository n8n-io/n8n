
/**
 * A single property handler for FindOptionsSelect.
 */
export type FindOptionsSelectProperty<Property> = Property extends Promise<infer I> ? FindOptionsSelectProperty<I> | boolean : Property extends Array<infer I> ? FindOptionsSelectProperty<I> | boolean : Property extends string ? boolean : Property extends number ? boolean : Property extends boolean ? boolean : Property extends Function ? never : Property extends Buffer ? boolean : Property extends Date ? boolean : Property extends object ? FindOptionsSelect<Property> : boolean;
/**
 * Select find options.
 */
export type FindOptionsSelect<Entity> = {
    [P in keyof Entity]?: P extends "toString" ? unknown : FindOptionsSelectProperty<NonNullable<Entity[P]>>;
};
/**
 * Property paths (column names) to be selected by "find" defined as string.
 * Old selection mechanism in TypeORM.
 *
 * @deprecated will be removed in the next version, use FindOptionsSelect type notation instead
 */
export type FindOptionsSelectByString<Entity> = (keyof Entity)[];
