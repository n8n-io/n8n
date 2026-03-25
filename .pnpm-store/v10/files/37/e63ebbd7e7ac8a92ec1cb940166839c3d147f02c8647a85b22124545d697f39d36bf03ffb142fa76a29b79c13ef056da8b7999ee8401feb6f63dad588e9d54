import { GeminiFunctionSchema, GeminiJsonSchema } from "../types.js";
import { InteropZodType } from "@langchain/core/utils/types";
import { JsonSchema7Type } from "@langchain/core/utils/json_schema";
import { SerializableSchema } from "@langchain/core/utils/standard_schema";

//#region src/utils/zod_to_gemini_parameters.d.ts
declare function adjustObjectType(obj: Record<string, any>): Record<string, any>;
declare function removeAdditionalProperties(obj: Record<string, any>): GeminiJsonSchema;
declare function schemaToGeminiParameters<RunOutput extends Record<string, any> = Record<string, any>>(schema: SerializableSchema<RunOutput> | InteropZodType<RunOutput> | JsonSchema7Type): GeminiFunctionSchema;
declare function jsonSchemaToGeminiParameters(schema: Record<string, any>): GeminiFunctionSchema;
//#endregion
export { adjustObjectType, jsonSchemaToGeminiParameters, removeAdditionalProperties, schemaToGeminiParameters };
//# sourceMappingURL=zod_to_gemini_parameters.d.ts.map