
import { FindOperator } from "./FindOperator";
import { EqualOperator } from "./EqualOperator";
/**
 * A single property handler for FindOptionsWhere.
 *
 * The reason why we have both "PropertyToBeNarrowed" and "Property" is that Union is narrowed down when extends is used.
 * It means the result of FindOptionsWhereProperty<1 | 2> doesn't include FindOperator<1 | 2> but FindOperator<1> | FindOperator<2>.
 * So we keep the original Union as Original and pass it to the FindOperator too. Original remains Union as extends is not used for it.
 */
export type FindOptionsWhereProperty<PropertyToBeNarrowed, Property = PropertyToBeNarrowed> = PropertyToBeNarrowed extends Promise<infer I> ? FindOptionsWhereProperty<NonNullable<I>> : PropertyToBeNarrowed extends Array<infer I> ? FindOptionsWhereProperty<NonNullable<I>> : PropertyToBeNarrowed extends Function ? never : PropertyToBeNarrowed extends Buffer ? Property | FindOperator<Property> : PropertyToBeNarrowed extends Date ? Property | FindOperator<Property> : PropertyToBeNarrowed extends string ? Property | FindOperator<Property> : PropertyToBeNarrowed extends number ? Property | FindOperator<Property> : PropertyToBeNarrowed extends boolean ? Property | FindOperator<Property> : PropertyToBeNarrowed extends object ? FindOptionsWhere<Property> | FindOptionsWhere<Property>[] | EqualOperator<Property> | FindOperator<any> | boolean | Property : Property | FindOperator<Property>;
/**
 * Used for find operations.
 */
export type FindOptionsWhere<Entity> = {
    [P in keyof Entity]?: P extends "toString" ? unknown : FindOptionsWhereProperty<NonNullable<Entity[P]>>;
};
