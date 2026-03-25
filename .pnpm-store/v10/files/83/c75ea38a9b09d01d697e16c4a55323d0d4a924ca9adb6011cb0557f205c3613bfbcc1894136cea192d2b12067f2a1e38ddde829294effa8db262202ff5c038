import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { JsonSchema, JsonSchema$Outbound } from "./jsonschema.js";
import { ResponseFormats } from "./responseformats.js";
export type ResponseFormat = {
    /**
     * An object specifying the format that the model must output. Setting to `{ "type": "json_object" }` enables JSON mode, which guarantees the message the model generates is in JSON. When using JSON mode you MUST also instruct the model to produce JSON yourself with a system or a user message.
     */
    type?: ResponseFormats | undefined;
    jsonSchema?: JsonSchema | null | undefined;
};
/** @internal */
export declare const ResponseFormat$inboundSchema: z.ZodType<ResponseFormat, z.ZodTypeDef, unknown>;
/** @internal */
export type ResponseFormat$Outbound = {
    type?: string | undefined;
    json_schema?: JsonSchema$Outbound | null | undefined;
};
/** @internal */
export declare const ResponseFormat$outboundSchema: z.ZodType<ResponseFormat$Outbound, z.ZodTypeDef, ResponseFormat>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ResponseFormat$ {
    /** @deprecated use `ResponseFormat$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ResponseFormat, z.ZodTypeDef, unknown>;
    /** @deprecated use `ResponseFormat$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ResponseFormat$Outbound, z.ZodTypeDef, ResponseFormat>;
    /** @deprecated use `ResponseFormat$Outbound` instead. */
    type Outbound = ResponseFormat$Outbound;
}
export declare function responseFormatToJSON(responseFormat: ResponseFormat): string;
export declare function responseFormatFromJSON(jsonString: string): SafeParseResult<ResponseFormat, SDKValidationError>;
//# sourceMappingURL=responseformat.d.ts.map