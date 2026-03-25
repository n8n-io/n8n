import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const ResponseErrorEventType: {
    readonly ConversationResponseError: "conversation.response.error";
};
export type ResponseErrorEventType = ClosedEnum<typeof ResponseErrorEventType>;
export type ResponseErrorEvent = {
    type?: ResponseErrorEventType | undefined;
    createdAt?: Date | undefined;
    message: string;
    code: number;
};
/** @internal */
export declare const ResponseErrorEventType$inboundSchema: z.ZodNativeEnum<typeof ResponseErrorEventType>;
/** @internal */
export declare const ResponseErrorEventType$outboundSchema: z.ZodNativeEnum<typeof ResponseErrorEventType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ResponseErrorEventType$ {
    /** @deprecated use `ResponseErrorEventType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly ConversationResponseError: "conversation.response.error";
    }>;
    /** @deprecated use `ResponseErrorEventType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly ConversationResponseError: "conversation.response.error";
    }>;
}
/** @internal */
export declare const ResponseErrorEvent$inboundSchema: z.ZodType<ResponseErrorEvent, z.ZodTypeDef, unknown>;
/** @internal */
export type ResponseErrorEvent$Outbound = {
    type: string;
    created_at?: string | undefined;
    message: string;
    code: number;
};
/** @internal */
export declare const ResponseErrorEvent$outboundSchema: z.ZodType<ResponseErrorEvent$Outbound, z.ZodTypeDef, ResponseErrorEvent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ResponseErrorEvent$ {
    /** @deprecated use `ResponseErrorEvent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ResponseErrorEvent, z.ZodTypeDef, unknown>;
    /** @deprecated use `ResponseErrorEvent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ResponseErrorEvent$Outbound, z.ZodTypeDef, ResponseErrorEvent>;
    /** @deprecated use `ResponseErrorEvent$Outbound` instead. */
    type Outbound = ResponseErrorEvent$Outbound;
}
export declare function responseErrorEventToJSON(responseErrorEvent: ResponseErrorEvent): string;
export declare function responseErrorEventFromJSON(jsonString: string): SafeParseResult<ResponseErrorEvent, SDKValidationError>;
//# sourceMappingURL=responseerrorevent.d.ts.map