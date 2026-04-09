import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const BaseFieldDefinitionType: {
    readonly Enum: "ENUM";
    readonly Text: "TEXT";
    readonly Int: "INT";
    readonly Float: "FLOAT";
    readonly Bool: "BOOL";
    readonly Timestamp: "TIMESTAMP";
    readonly Array: "ARRAY";
};
export type BaseFieldDefinitionType = ClosedEnum<typeof BaseFieldDefinitionType>;
export declare const SupportedOperators: {
    readonly Lt: "lt";
    readonly Lte: "lte";
    readonly Gt: "gt";
    readonly Gte: "gte";
    readonly Startswith: "startswith";
    readonly Istartswith: "istartswith";
    readonly Endswith: "endswith";
    readonly Iendswith: "iendswith";
    readonly Contains: "contains";
    readonly Icontains: "icontains";
    readonly Matches: "matches";
    readonly Notcontains: "notcontains";
    readonly Inotcontains: "inotcontains";
    readonly Eq: "eq";
    readonly Neq: "neq";
    readonly Isnull: "isnull";
    readonly Includes: "includes";
    readonly Excludes: "excludes";
    readonly LenEq: "len_eq";
};
export type SupportedOperators = ClosedEnum<typeof SupportedOperators>;
export type BaseFieldDefinition = {
    name: string;
    label: string;
    type: BaseFieldDefinitionType;
    group?: string | null | undefined;
    supportedOperators: Array<SupportedOperators>;
};
/** @internal */
export declare const BaseFieldDefinitionType$inboundSchema: z.ZodNativeEnum<typeof BaseFieldDefinitionType>;
/** @internal */
export declare const SupportedOperators$inboundSchema: z.ZodNativeEnum<typeof SupportedOperators>;
/** @internal */
export declare const BaseFieldDefinition$inboundSchema: z.ZodType<BaseFieldDefinition, z.ZodTypeDef, unknown>;
export declare function baseFieldDefinitionFromJSON(jsonString: string): SafeParseResult<BaseFieldDefinition, SDKValidationError>;
//# sourceMappingURL=basefielddefinition.d.ts.map