import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type ExtraFields = boolean | number | number | string | Date | Array<string>;
export type ChatCompletionEventPreview = {
    eventId: string;
    correlationId: string;
    createdAt: Date;
    extraFields: {
        [k: string]: boolean | number | number | string | Date | Array<string> | null;
    };
    nbInputTokens: number;
    nbOutputTokens: number;
};
/** @internal */
export declare const ExtraFields$inboundSchema: z.ZodType<ExtraFields, z.ZodTypeDef, unknown>;
export declare function extraFieldsFromJSON(jsonString: string): SafeParseResult<ExtraFields, SDKValidationError>;
/** @internal */
export declare const ChatCompletionEventPreview$inboundSchema: z.ZodType<ChatCompletionEventPreview, z.ZodTypeDef, unknown>;
export declare function chatCompletionEventPreviewFromJSON(jsonString: string): SafeParseResult<ChatCompletionEventPreview, SDKValidationError>;
//# sourceMappingURL=chatcompletioneventpreview.d.ts.map