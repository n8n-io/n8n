import { ColumnType } from "../../driver/types/ColumnTypes";
import { ValueTransformer } from "./ValueTransformer";
/**
 * Describes all calculated column's options.
 */
export interface VirtualColumnOptions {
    /**
     * Column type. Must be one of the value from the ColumnTypes class.
     */
    type?: ColumnType;
    /**
     * Return type of HSTORE column.
     * Returns value as string or as object.
     */
    hstoreType?: "object" | "string";
    /**
     * Query to be used to populate the column data. This query is used when generating the relational db script.
     * The query function is called with the current entities alias either defined by the Entity Decorator or automatically
     * @See https://typeorm.io/decorator-reference#virtualcolumn for more details.
     */
    query: (alias: string) => string;
    /**
     * Specifies a value transformer(s) that is to be used to unmarshal
     * this column when reading from the database.
     */
    transformer?: ValueTransformer | ValueTransformer[];
}
