import type { ListSchema as IListSchema, SchemaRef, SchemaTraits } from "@smithy/types";
import { Schema } from "./Schema";
/**
 * A schema with a single member schema.
 * The deprecated Set type may be represented as a list.
 *
 * @internal
 * @deprecated use StaticSchema
 */
export declare class ListSchema extends Schema implements IListSchema {
    static readonly symbol: unique symbol;
    name: string;
    traits: SchemaTraits;
    valueSchema: SchemaRef;
    protected readonly symbol: symbol;
}
/**
 * Factory for ListSchema.
 *
 * @internal
 * @deprecated use StaticSchema
 */
export declare const list: (namespace: string, name: string, traits: SchemaTraits, valueSchema: SchemaRef) => ListSchema;
