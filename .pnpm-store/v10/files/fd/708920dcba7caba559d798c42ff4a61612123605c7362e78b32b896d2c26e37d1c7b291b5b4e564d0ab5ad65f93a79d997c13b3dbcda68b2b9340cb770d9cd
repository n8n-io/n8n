import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { AssistantMessage, AssistantMessage$Outbound } from "./assistantmessage.js";
import { SystemMessage, SystemMessage$Outbound } from "./systemmessage.js";
import { ToolMessage, ToolMessage$Outbound } from "./toolmessage.js";
import { UserMessage, UserMessage$Outbound } from "./usermessage.js";
export type Two = (SystemMessage & {
    role: "system";
}) | (ToolMessage & {
    role: "tool";
}) | (UserMessage & {
    role: "user";
}) | (AssistantMessage & {
    role: "assistant";
});
export type One = (SystemMessage & {
    role: "system";
}) | (ToolMessage & {
    role: "tool";
}) | (UserMessage & {
    role: "user";
}) | (AssistantMessage & {
    role: "assistant";
});
/**
 * Chat to classify
 */
export type ChatModerationRequestInputs = Array<(SystemMessage & {
    role: "system";
}) | (ToolMessage & {
    role: "tool";
}) | (UserMessage & {
    role: "user";
}) | (AssistantMessage & {
    role: "assistant";
})> | Array<Array<(SystemMessage & {
    role: "system";
}) | (ToolMessage & {
    role: "tool";
}) | (UserMessage & {
    role: "user";
}) | (AssistantMessage & {
    role: "assistant";
})>>;
export type ChatModerationRequest = {
    /**
     * Chat to classify
     */
    inputs: Array<(SystemMessage & {
        role: "system";
    }) | (ToolMessage & {
        role: "tool";
    }) | (UserMessage & {
        role: "user";
    }) | (AssistantMessage & {
        role: "assistant";
    })> | Array<Array<(SystemMessage & {
        role: "system";
    }) | (ToolMessage & {
        role: "tool";
    }) | (UserMessage & {
        role: "user";
    }) | (AssistantMessage & {
        role: "assistant";
    })>>;
    model: string;
};
/** @internal */
export declare const Two$inboundSchema: z.ZodType<Two, z.ZodTypeDef, unknown>;
/** @internal */
export type Two$Outbound = (SystemMessage$Outbound & {
    role: "system";
}) | (ToolMessage$Outbound & {
    role: "tool";
}) | (UserMessage$Outbound & {
    role: "user";
}) | (AssistantMessage$Outbound & {
    role: "assistant";
});
/** @internal */
export declare const Two$outboundSchema: z.ZodType<Two$Outbound, z.ZodTypeDef, Two>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Two$ {
    /** @deprecated use `Two$inboundSchema` instead. */
    const inboundSchema: z.ZodType<Two, z.ZodTypeDef, unknown>;
    /** @deprecated use `Two$outboundSchema` instead. */
    const outboundSchema: z.ZodType<Two$Outbound, z.ZodTypeDef, Two>;
    /** @deprecated use `Two$Outbound` instead. */
    type Outbound = Two$Outbound;
}
export declare function twoToJSON(two: Two): string;
export declare function twoFromJSON(jsonString: string): SafeParseResult<Two, SDKValidationError>;
/** @internal */
export declare const One$inboundSchema: z.ZodType<One, z.ZodTypeDef, unknown>;
/** @internal */
export type One$Outbound = (SystemMessage$Outbound & {
    role: "system";
}) | (ToolMessage$Outbound & {
    role: "tool";
}) | (UserMessage$Outbound & {
    role: "user";
}) | (AssistantMessage$Outbound & {
    role: "assistant";
});
/** @internal */
export declare const One$outboundSchema: z.ZodType<One$Outbound, z.ZodTypeDef, One>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace One$ {
    /** @deprecated use `One$inboundSchema` instead. */
    const inboundSchema: z.ZodType<One, z.ZodTypeDef, unknown>;
    /** @deprecated use `One$outboundSchema` instead. */
    const outboundSchema: z.ZodType<One$Outbound, z.ZodTypeDef, One>;
    /** @deprecated use `One$Outbound` instead. */
    type Outbound = One$Outbound;
}
export declare function oneToJSON(one: One): string;
export declare function oneFromJSON(jsonString: string): SafeParseResult<One, SDKValidationError>;
/** @internal */
export declare const ChatModerationRequestInputs$inboundSchema: z.ZodType<ChatModerationRequestInputs, z.ZodTypeDef, unknown>;
/** @internal */
export type ChatModerationRequestInputs$Outbound = Array<(SystemMessage$Outbound & {
    role: "system";
}) | (ToolMessage$Outbound & {
    role: "tool";
}) | (UserMessage$Outbound & {
    role: "user";
}) | (AssistantMessage$Outbound & {
    role: "assistant";
})> | Array<Array<(SystemMessage$Outbound & {
    role: "system";
}) | (ToolMessage$Outbound & {
    role: "tool";
}) | (UserMessage$Outbound & {
    role: "user";
}) | (AssistantMessage$Outbound & {
    role: "assistant";
})>>;
/** @internal */
export declare const ChatModerationRequestInputs$outboundSchema: z.ZodType<ChatModerationRequestInputs$Outbound, z.ZodTypeDef, ChatModerationRequestInputs>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ChatModerationRequestInputs$ {
    /** @deprecated use `ChatModerationRequestInputs$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ChatModerationRequestInputs, z.ZodTypeDef, unknown>;
    /** @deprecated use `ChatModerationRequestInputs$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ChatModerationRequestInputs$Outbound, z.ZodTypeDef, ChatModerationRequestInputs>;
    /** @deprecated use `ChatModerationRequestInputs$Outbound` instead. */
    type Outbound = ChatModerationRequestInputs$Outbound;
}
export declare function chatModerationRequestInputsToJSON(chatModerationRequestInputs: ChatModerationRequestInputs): string;
export declare function chatModerationRequestInputsFromJSON(jsonString: string): SafeParseResult<ChatModerationRequestInputs, SDKValidationError>;
/** @internal */
export declare const ChatModerationRequest$inboundSchema: z.ZodType<ChatModerationRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type ChatModerationRequest$Outbound = {
    input: Array<(SystemMessage$Outbound & {
        role: "system";
    }) | (ToolMessage$Outbound & {
        role: "tool";
    }) | (UserMessage$Outbound & {
        role: "user";
    }) | (AssistantMessage$Outbound & {
        role: "assistant";
    })> | Array<Array<(SystemMessage$Outbound & {
        role: "system";
    }) | (ToolMessage$Outbound & {
        role: "tool";
    }) | (UserMessage$Outbound & {
        role: "user";
    }) | (AssistantMessage$Outbound & {
        role: "assistant";
    })>>;
    model: string;
};
/** @internal */
export declare const ChatModerationRequest$outboundSchema: z.ZodType<ChatModerationRequest$Outbound, z.ZodTypeDef, ChatModerationRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ChatModerationRequest$ {
    /** @deprecated use `ChatModerationRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ChatModerationRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `ChatModerationRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ChatModerationRequest$Outbound, z.ZodTypeDef, ChatModerationRequest>;
    /** @deprecated use `ChatModerationRequest$Outbound` instead. */
    type Outbound = ChatModerationRequest$Outbound;
}
export declare function chatModerationRequestToJSON(chatModerationRequest: ChatModerationRequest): string;
export declare function chatModerationRequestFromJSON(jsonString: string): SafeParseResult<ChatModerationRequest, SDKValidationError>;
//# sourceMappingURL=chatmoderationrequest.d.ts.map