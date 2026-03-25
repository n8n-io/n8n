import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ConversationUsageInfo, ConversationUsageInfo$Outbound } from "./conversationusageinfo.js";
export declare const ResponseDoneEventType: {
    readonly ConversationResponseDone: "conversation.response.done";
};
export type ResponseDoneEventType = ClosedEnum<typeof ResponseDoneEventType>;
export type ResponseDoneEvent = {
    type?: ResponseDoneEventType | undefined;
    createdAt?: Date | undefined;
    usage: ConversationUsageInfo;
};
/** @internal */
export declare const ResponseDoneEventType$inboundSchema: z.ZodNativeEnum<typeof ResponseDoneEventType>;
/** @internal */
export declare const ResponseDoneEventType$outboundSchema: z.ZodNativeEnum<typeof ResponseDoneEventType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ResponseDoneEventType$ {
    /** @deprecated use `ResponseDoneEventType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly ConversationResponseDone: "conversation.response.done";
    }>;
    /** @deprecated use `ResponseDoneEventType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly ConversationResponseDone: "conversation.response.done";
    }>;
}
/** @internal */
export declare const ResponseDoneEvent$inboundSchema: z.ZodType<ResponseDoneEvent, z.ZodTypeDef, unknown>;
/** @internal */
export type ResponseDoneEvent$Outbound = {
    type: string;
    created_at?: string | undefined;
    usage: ConversationUsageInfo$Outbound;
};
/** @internal */
export declare const ResponseDoneEvent$outboundSchema: z.ZodType<ResponseDoneEvent$Outbound, z.ZodTypeDef, ResponseDoneEvent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ResponseDoneEvent$ {
    /** @deprecated use `ResponseDoneEvent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ResponseDoneEvent, z.ZodTypeDef, unknown>;
    /** @deprecated use `ResponseDoneEvent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ResponseDoneEvent$Outbound, z.ZodTypeDef, ResponseDoneEvent>;
    /** @deprecated use `ResponseDoneEvent$Outbound` instead. */
    type Outbound = ResponseDoneEvent$Outbound;
}
export declare function responseDoneEventToJSON(responseDoneEvent: ResponseDoneEvent): string;
export declare function responseDoneEventFromJSON(jsonString: string): SafeParseResult<ResponseDoneEvent, SDKValidationError>;
//# sourceMappingURL=responsedoneevent.d.ts.map