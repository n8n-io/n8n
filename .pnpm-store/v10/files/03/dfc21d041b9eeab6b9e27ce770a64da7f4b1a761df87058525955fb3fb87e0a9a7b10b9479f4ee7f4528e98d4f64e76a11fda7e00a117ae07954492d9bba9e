import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type JsonSchema = {
    name: string;
    description?: string | null | undefined;
    schemaDefinition: {
        [k: string]: any;
    };
    strict?: boolean | undefined;
};
/** @internal */
export declare const JsonSchema$inboundSchema: z.ZodType<JsonSchema, z.ZodTypeDef, unknown>;
/** @internal */
export type JsonSchema$Outbound = {
    name: string;
    description?: string | null | undefined;
    schema: {
        [k: string]: any;
    };
    strict?: boolean | undefined;
};
/** @internal */
export declare const JsonSchema$outboundSchema: z.ZodType<JsonSchema$Outbound, z.ZodTypeDef, JsonSchema>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace JsonSchema$ {
    /** @deprecated use `JsonSchema$inboundSchema` instead. */
    const inboundSchema: z.ZodType<JsonSchema, z.ZodTypeDef, unknown>;
    /** @deprecated use `JsonSchema$outboundSchema` instead. */
    const outboundSchema: z.ZodType<JsonSchema$Outbound, z.ZodTypeDef, JsonSchema>;
    /** @deprecated use `JsonSchema$Outbound` instead. */
    type Outbound = JsonSchema$Outbound;
}
export declare function jsonSchemaToJSON(jsonSchema: JsonSchema): string;
export declare function jsonSchemaFromJSON(jsonString: string): SafeParseResult<JsonSchema, SDKValidationError>;
//# sourceMappingURL=jsonschema.d.ts.map