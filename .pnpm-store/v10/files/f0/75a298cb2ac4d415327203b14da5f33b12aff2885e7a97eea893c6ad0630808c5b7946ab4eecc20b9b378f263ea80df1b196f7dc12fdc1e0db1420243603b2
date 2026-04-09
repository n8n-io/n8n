import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ChatTranscriptionEvent } from "./chattranscriptionevent.js";
export type ChatCompletionEventExtraFields = boolean | number | number | string | Date | Array<string>;
export type ChatCompletionEvent = {
    eventId: string;
    correlationId: string;
    createdAt: Date;
    extraFields: {
        [k: string]: boolean | number | number | string | Date | Array<string> | null;
    };
    nbInputTokens: number;
    nbOutputTokens: number;
    enabledTools: Array<{
        [k: string]: any;
    }>;
    requestMessages: Array<{
        [k: string]: any;
    }>;
    responseMessages: Array<{
        [k: string]: any;
    }>;
    nbMessages: number;
    chatTranscriptionEvents: Array<ChatTranscriptionEvent>;
};
/** @internal */
export declare const ChatCompletionEventExtraFields$inboundSchema: z.ZodType<ChatCompletionEventExtraFields, z.ZodTypeDef, unknown>;
export declare function chatCompletionEventExtraFieldsFromJSON(jsonString: string): SafeParseResult<ChatCompletionEventExtraFields, SDKValidationError>;
/** @internal */
export declare const ChatCompletionEvent$inboundSchema: z.ZodType<ChatCompletionEvent, z.ZodTypeDef, unknown>;
export declare function chatCompletionEventFromJSON(jsonString: string): SafeParseResult<ChatCompletionEvent, SDKValidationError>;
//# sourceMappingURL=chatcompletionevent.d.ts.map