/**
 * Arguments for EmbeddedMetadata class.
 */
export interface EmbeddedMetadataArgs {
    /**
     * Class to which this column is applied.
     */
    target: Function | string;
    /**
     * Class's property name to which this column is applied.
     */
    propertyName: string;
    /**
     * Indicates if this embedded is array or not.
     */
    isArray: boolean;
    /**
     * Prefix of the embedded, used instead of propertyName.
     * If set to empty string, then prefix is not set at all.
     */
    prefix?: string | boolean;
    /**
     * Type of the class to be embedded.
     */
    type: (type?: any) => Function | string;
}
