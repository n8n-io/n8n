import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { AssistantMessage, AssistantMessage$Outbound } from "./assistantmessage.js";
import { InstructRequest, InstructRequest$Outbound } from "./instructrequest.js";
import { SystemMessage, SystemMessage$Outbound } from "./systemmessage.js";
import { ToolMessage, ToolMessage$Outbound } from "./toolmessage.js";
import { UserMessage, UserMessage$Outbound } from "./usermessage.js";
export type InstructRequestInputsMessages = (SystemMessage & {
    role: "system";
}) | (ToolMessage & {
    role: "tool";
}) | (UserMessage & {
    role: "user";
}) | (AssistantMessage & {
    role: "assistant";
});
export type InstructRequestInputs = {
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
/**
 * Chat to classify
 */
export type Inputs = InstructRequestInputs | Array<InstructRequest>;
/** @internal */
export declare const InstructRequestInputsMessages$inboundSchema: z.ZodType<InstructRequestInputsMessages, z.ZodTypeDef, unknown>;
/** @internal */
export type InstructRequestInputsMessages$Outbound = (SystemMessage$Outbound & {
    role: "system";
}) | (ToolMessage$Outbound & {
    role: "tool";
}) | (UserMessage$Outbound & {
    role: "user";
}) | (AssistantMessage$Outbound & {
    role: "assistant";
});
/** @internal */
export declare const InstructRequestInputsMessages$outboundSchema: z.ZodType<InstructRequestInputsMessages$Outbound, z.ZodTypeDef, InstructRequestInputsMessages>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace InstructRequestInputsMessages$ {
    /** @deprecated use `InstructRequestInputsMessages$inboundSchema` instead. */
    const inboundSchema: z.ZodType<InstructRequestInputsMessages, z.ZodTypeDef, unknown>;
    /** @deprecated use `InstructRequestInputsMessages$outboundSchema` instead. */
    const outboundSchema: z.ZodType<InstructRequestInputsMessages$Outbound, z.ZodTypeDef, InstructRequestInputsMessages>;
    /** @deprecated use `InstructRequestInputsMessages$Outbound` instead. */
    type Outbound = InstructRequestInputsMessages$Outbound;
}
export declare function instructRequestInputsMessagesToJSON(instructRequestInputsMessages: InstructRequestInputsMessages): string;
export declare function instructRequestInputsMessagesFromJSON(jsonString: string): SafeParseResult<InstructRequestInputsMessages, SDKValidationError>;
/** @internal */
export declare const InstructRequestInputs$inboundSchema: z.ZodType<InstructRequestInputs, z.ZodTypeDef, unknown>;
/** @internal */
export type InstructRequestInputs$Outbound = {
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
export declare const InstructRequestInputs$outboundSchema: z.ZodType<InstructRequestInputs$Outbound, z.ZodTypeDef, InstructRequestInputs>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace InstructRequestInputs$ {
    /** @deprecated use `InstructRequestInputs$inboundSchema` instead. */
    const inboundSchema: z.ZodType<InstructRequestInputs, z.ZodTypeDef, unknown>;
    /** @deprecated use `InstructRequestInputs$outboundSchema` instead. */
    const outboundSchema: z.ZodType<InstructRequestInputs$Outbound, z.ZodTypeDef, InstructRequestInputs>;
    /** @deprecated use `InstructRequestInputs$Outbound` instead. */
    type Outbound = InstructRequestInputs$Outbound;
}
export declare function instructRequestInputsToJSON(instructRequestInputs: InstructRequestInputs): string;
export declare function instructRequestInputsFromJSON(jsonString: string): SafeParseResult<InstructRequestInputs, SDKValidationError>;
/** @internal */
export declare const Inputs$inboundSchema: z.ZodType<Inputs, z.ZodTypeDef, unknown>;
/** @internal */
export type Inputs$Outbound = InstructRequestInputs$Outbound | Array<InstructRequest$Outbound>;
/** @internal */
export declare const Inputs$outboundSchema: z.ZodType<Inputs$Outbound, z.ZodTypeDef, Inputs>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Inputs$ {
    /** @deprecated use `Inputs$inboundSchema` instead. */
    const inboundSchema: z.ZodType<Inputs, z.ZodTypeDef, unknown>;
    /** @deprecated use `Inputs$outboundSchema` instead. */
    const outboundSchema: z.ZodType<Inputs$Outbound, z.ZodTypeDef, Inputs>;
    /** @deprecated use `Inputs$Outbound` instead. */
    type Outbound = Inputs$Outbound;
}
export declare function inputsToJSON(inputs: Inputs): string;
export declare function inputsFromJSON(jsonString: string): SafeParseResult<Inputs, SDKValidationError>;
//# sourceMappingURL=inputs.d.ts.map