import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { BaseFieldDefinition } from "./basefielddefinition.js";
import { FieldGroup } from "./fieldgroup.js";
export type ChatCompletionFields = {
    fieldDefinitions: Array<BaseFieldDefinition>;
    fieldGroups: Array<FieldGroup>;
};
/** @internal */
export declare const ChatCompletionFields$inboundSchema: z.ZodType<ChatCompletionFields, z.ZodTypeDef, unknown>;
export declare function chatCompletionFieldsFromJSON(jsonString: string): SafeParseResult<ChatCompletionFields, SDKValidationError>;
//# sourceMappingURL=chatcompletionfields.d.ts.map