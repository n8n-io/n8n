/**
 * Interface for objects that deal with (un)marshalling data.
 */
export interface ValueTransformer {
    /**
     * Used to marshal data when writing to the database.
     */
    to(value: any): any;
    /**
     * Used to unmarshal data when reading from the database.
     */
    from(value: any): any;
}
