import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const ResponseStartedEventType: {
    readonly ConversationResponseStarted: "conversation.response.started";
};
export type ResponseStartedEventType = ClosedEnum<typeof ResponseStartedEventType>;
export type ResponseStartedEvent = {
    type?: ResponseStartedEventType | undefined;
    createdAt?: Date | undefined;
    conversationId: string;
};
/** @internal */
export declare const ResponseStartedEventType$inboundSchema: z.ZodNativeEnum<typeof ResponseStartedEventType>;
/** @internal */
export declare const ResponseStartedEventType$outboundSchema: z.ZodNativeEnum<typeof ResponseStartedEventType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ResponseStartedEventType$ {
    /** @deprecated use `ResponseStartedEventType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly ConversationResponseStarted: "conversation.response.started";
    }>;
    /** @deprecated use `ResponseStartedEventType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly ConversationResponseStarted: "conversation.response.started";
    }>;
}
/** @internal */
export declare const ResponseStartedEvent$inboundSchema: z.ZodType<ResponseStartedEvent, z.ZodTypeDef, unknown>;
/** @internal */
export type ResponseStartedEvent$Outbound = {
    type: string;
    created_at?: string | undefined;
    conversation_id: string;
};
/** @internal */
export declare const ResponseStartedEvent$outboundSchema: z.ZodType<ResponseStartedEvent$Outbound, z.ZodTypeDef, ResponseStartedEvent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ResponseStartedEvent$ {
    /** @deprecated use `ResponseStartedEvent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ResponseStartedEvent, z.ZodTypeDef, unknown>;
    /** @deprecated use `ResponseStartedEvent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ResponseStartedEvent$Outbound, z.ZodTypeDef, ResponseStartedEvent>;
    /** @deprecated use `ResponseStartedEvent$Outbound` instead. */
    type Outbound = ResponseStartedEvent$Outbound;
}
export declare function responseStartedEventToJSON(responseStartedEvent: ResponseStartedEvent): string;
export declare function responseStartedEventFromJSON(jsonString: string): SafeParseResult<ResponseStartedEvent, SDKValidationError>;
//# sourceMappingURL=responsestartedevent.d.ts.map