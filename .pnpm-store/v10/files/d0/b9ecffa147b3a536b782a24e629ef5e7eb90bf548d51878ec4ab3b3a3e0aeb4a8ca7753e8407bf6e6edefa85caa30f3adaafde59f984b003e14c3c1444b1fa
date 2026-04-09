import * as z from "zod/v3";
import { AssistantMessage, AssistantMessage$Outbound } from "./assistantmessage.js";
import { SystemMessage, SystemMessage$Outbound } from "./systemmessage.js";
import { ToolMessage, ToolMessage$Outbound } from "./toolmessage.js";
import { UserMessage, UserMessage$Outbound } from "./usermessage.js";
export type InstructRequestMessages = (AssistantMessage & {
    role: "assistant";
}) | (SystemMessage & {
    role: "system";
}) | (ToolMessage & {
    role: "tool";
}) | (UserMessage & {
    role: "user";
});
export type InstructRequest = {
    messages: Array<(AssistantMessage & {
        role: "assistant";
    }) | (SystemMessage & {
        role: "system";
    }) | (ToolMessage & {
        role: "tool";
    }) | (UserMessage & {
        role: "user";
    })>;
};
/** @internal */
export type InstructRequestMessages$Outbound = (AssistantMessage$Outbound & {
    role: "assistant";
}) | (SystemMessage$Outbound & {
    role: "system";
}) | (ToolMessage$Outbound & {
    role: "tool";
}) | (UserMessage$Outbound & {
    role: "user";
});
/** @internal */
export declare const InstructRequestMessages$outboundSchema: z.ZodType<InstructRequestMessages$Outbound, z.ZodTypeDef, InstructRequestMessages>;
export declare function instructRequestMessagesToJSON(instructRequestMessages: InstructRequestMessages): string;
/** @internal */
export type InstructRequest$Outbound = {
    messages: Array<(AssistantMessage$Outbound & {
        role: "assistant";
    }) | (SystemMessage$Outbound & {
        role: "system";
    }) | (ToolMessage$Outbound & {
        role: "tool";
    }) | (UserMessage$Outbound & {
        role: "user";
    })>;
};
/** @internal */
export declare const InstructRequest$outboundSchema: z.ZodType<InstructRequest$Outbound, z.ZodTypeDef, InstructRequest>;
export declare function instructRequestToJSON(instructRequest: InstructRequest): string;
//# sourceMappingURL=instructrequest.d.ts.map