import type { SchemaRef, SchemaTraits, StructureSchema as IStructureSchema } from "@smithy/types";
import { Schema } from "./Schema";
/**
 * A structure schema has a known list of members. This is also used for unions.
 *
 * @internal
 * @deprecated use StaticSchema
 */
export declare class StructureSchema extends Schema implements IStructureSchema {
    static symbol: symbol;
    name: string;
    traits: SchemaTraits;
    memberNames: string[];
    memberList: SchemaRef[];
    protected readonly symbol: symbol;
}
/**
 * Factory for StructureSchema.
 *
 * @internal
 * @deprecated use StaticSchema
 */
export declare const struct: (namespace: string, name: string, traits: SchemaTraits, memberNames: string[], memberList: SchemaRef[]) => StructureSchema;
