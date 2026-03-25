import { SchemaRef, SchemaTraits, TraitsSchema } from "@smithy/types";
import { Schema } from "./Schema";
/**
 * Although numeric values exist for most simple schema, this class is used for cases where traits are
 * attached to those schema, since a single number cannot easily represent both a schema and its traits.
 *
 * @internal
 * @deprecated use StaticSchema
 */
export declare class SimpleSchema extends Schema implements TraitsSchema {
    static readonly symbol: unique symbol;
    name: string;
    schemaRef: SchemaRef;
    traits: SchemaTraits;
    protected readonly symbol: symbol;
}
/**
 * Factory for simple schema class objects.
 *
 * @internal
 * @deprecated use StaticSchema
 */
export declare const sim: (namespace: string, name: string, schemaRef: SchemaRef, traits: SchemaTraits) => SimpleSchema;
/**
 * @internal
 * @deprecated
 */
export declare const simAdapter: (namespace: string, name: string, traits: SchemaTraits, schemaRef: SchemaRef) => SimpleSchema;
