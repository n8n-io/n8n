import { EntityMetadata } from "../metadata/EntityMetadata";
/**
 */
export declare class Alias {
    type: "from" | "select" | "join" | "other";
    name: string;
    /**
     * Table on which this alias is applied.
     * Used only for aliases which select custom tables.
     */
    tablePath?: string;
    /**
     * If this alias is for sub query.
     */
    subQuery?: string;
    constructor(alias?: Alias);
    private _metadata?;
    get target(): Function | string;
    get hasMetadata(): boolean;
    set metadata(metadata: EntityMetadata);
    get metadata(): EntityMetadata;
}
