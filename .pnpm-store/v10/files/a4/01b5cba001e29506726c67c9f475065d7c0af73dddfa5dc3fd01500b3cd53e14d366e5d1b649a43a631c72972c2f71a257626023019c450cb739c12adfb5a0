import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { JsonSchema, JsonSchema$Outbound } from "./jsonschema.js";
import { ResponseFormats } from "./responseformats.js";
/**
 * Specify the format that the model must output. By default it will use `{ "type": "text" }`. Setting to `{ "type": "json_object" }` enables JSON mode, which guarantees the message the model generates is in JSON. When using JSON mode you MUST also instruct the model to produce JSON yourself with a system or a user message. Setting to `{ "type": "json_schema" }` enables JSON schema mode, which guarantees the message the model generates is in JSON and follows the schema you provide.
 */
export type ResponseFormat = {
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
export declare function responseFormatToJSON(responseFormat: ResponseFormat): string;
export declare function responseFormatFromJSON(jsonString: string): SafeParseResult<ResponseFormat, SDKValidationError>;
//# sourceMappingURL=responseformat.d.ts.map