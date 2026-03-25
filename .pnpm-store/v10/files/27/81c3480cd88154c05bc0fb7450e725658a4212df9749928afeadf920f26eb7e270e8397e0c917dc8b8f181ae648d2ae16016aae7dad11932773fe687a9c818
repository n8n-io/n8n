import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { AssistantMessage, AssistantMessage$Outbound } from "./assistantmessage.js";
import { SystemMessage, SystemMessage$Outbound } from "./systemmessage.js";
import { ToolMessage, ToolMessage$Outbound } from "./toolmessage.js";
import { UserMessage, UserMessage$Outbound } from "./usermessage.js";
export type InstructRequestMessages = (SystemMessage & {
    role: "system";
}) | (ToolMessage & {
    role: "tool";
}) | (UserMessage & {
    role: "user";
}) | (AssistantMessage & {
    role: "assistant";
});
export type InstructRequest = {
    messages: Array<(SystemMessage & {
        role: "system";
    }) | (ToolMessage & {
        role: "tool";
    }) | (UserMessage & {
        role: "user";
    }) | (AssistantMessage & {
        role: "assistant";
    })>;
};
/** @internal */
export declare const InstructRequestMessages$inboundSchema: z.ZodType<InstructRequestMessages, z.ZodTypeDef, unknown>;
/** @internal */
export type InstructRequestMessages$Outbound = (SystemMessage$Outbound & {
    role: "system";
}) | (ToolMessage$Outbound & {
    role: "tool";
}) | (UserMessage$Outbound & {
    role: "user";
}) | (AssistantMessage$Outbound & {
    role: "assistant";
});
/** @internal */
export declare const InstructRequestMessages$outboundSchema: z.ZodType<InstructRequestMessages$Outbound, z.ZodTypeDef, InstructRequestMessages>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace InstructRequestMessages$ {
    /** @deprecated use `InstructRequestMessages$inboundSchema` instead. */
    const inboundSchema: z.ZodType<InstructRequestMessages, z.ZodTypeDef, unknown>;
    /** @deprecated use `InstructRequestMessages$outboundSchema` instead. */
    const outboundSchema: z.ZodType<InstructRequestMessages$Outbound, z.ZodTypeDef, InstructRequestMessages>;
    /** @deprecated use `InstructRequestMessages$Outbound` instead. */
    type Outbound = InstructRequestMessages$Outbound;
}
export declare function instructRequestMessagesToJSON(instructRequestMessages: InstructRequestMessages): string;
export declare function instructRequestMessagesFromJSON(jsonString: string): SafeParseResult<InstructRequestMessages, SDKValidationError>;
/** @internal */
export declare const InstructRequest$inboundSchema: z.ZodType<InstructRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type InstructRequest$Outbound = {
    messages: Array<(SystemMessage$Outbound & {
        role: "system";
    }) | (ToolMessage$Outbound & {
        role: "tool";
    }) | (UserMessage$Outbound & {
        role: "user";
    }) | (AssistantMessage$Outbound & {
        role: "assistant";
    })>;
};
/** @internal */
export declare const InstructRequest$outboundSchema: z.ZodType<InstructRequest$Outbound, z.ZodTypeDef, InstructRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace InstructRequest$ {
    /** @deprecated use `InstructRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<InstructRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `InstructRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<InstructRequest$Outbound, z.ZodTypeDef, InstructRequest>;
    /** @deprecated use `InstructRequest$Outbound` instead. */
    type Outbound = InstructRequest$Outbound;
}
export declare function instructRequestToJSON(instructRequest: InstructRequest): string;
export declare function instructRequestFromJSON(jsonString: string): SafeParseResult<InstructRequest, SDKValidationError>;
//# sourceMappingURL=instructrequest.d.ts.map