import { SelectQueryBuilder } from "../query-builder/SelectQueryBuilder";
/**
 * Arguments for RelationCountMetadata class.
 */
export interface RelationCountMetadataArgs {
    /**
     * Class to which this decorator is applied.
     */
    readonly target: Function;
    /**
     * Class's property name to which this decorator is applied.
     */
    readonly propertyName: string;
    /**
     * Target's relation which it should count.
     */
    readonly relation: string | ((object: any) => any);
    /**
     * Alias of the joined (destination) table.
     */
    readonly alias?: string;
    /**
     * Extra condition applied to "ON" section of join.
     */
    readonly queryBuilderFactory?: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>;
}
