import { OperationSchema as IOperationSchema, SchemaRef, SchemaTraits } from "@smithy/types";
import { Schema } from "./Schema";
/**
 * This is used as a reference container for the input/output pair of schema, and for trait
 * detection on the operation that may affect client protocol logic.
 *
 * @internal
 * @deprecated use StaticSchema
 */
export declare class OperationSchema extends Schema implements IOperationSchema {
    static readonly symbol: unique symbol;
    name: string;
    traits: SchemaTraits;
    input: SchemaRef;
    output: SchemaRef;
    protected readonly symbol: symbol;
}
/**
 * Factory for OperationSchema.
 * @internal
 * @deprecated use StaticSchema
 */
export declare const op: (namespace: string, name: string, traits: SchemaTraits, input: SchemaRef, output: SchemaRef) => OperationSchema;
