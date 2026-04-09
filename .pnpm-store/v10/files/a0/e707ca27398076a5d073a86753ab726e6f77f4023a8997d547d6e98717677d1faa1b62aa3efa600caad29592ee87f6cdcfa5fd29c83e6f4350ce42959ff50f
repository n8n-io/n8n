import * as z from "zod/v3";
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
export declare function jsonSchemaToJSON(jsonSchema: JsonSchema): string;
export declare function jsonSchemaFromJSON(jsonString: string): SafeParseResult<JsonSchema, SDKValidationError>;
//# sourceMappingURL=jsonschema.d.ts.map