import * as z from "zod/v3";
import { AssistantMessage, AssistantMessage$Outbound } from "./assistantmessage.js";
import { SystemMessage, SystemMessage$Outbound } from "./systemmessage.js";
import { ToolMessage, ToolMessage$Outbound } from "./toolmessage.js";
import { UserMessage, UserMessage$Outbound } from "./usermessage.js";
export type Two = (AssistantMessage & {
    role: "assistant";
}) | (SystemMessage & {
    role: "system";
}) | (ToolMessage & {
    role: "tool";
}) | (UserMessage & {
    role: "user";
});
export type One = (AssistantMessage & {
    role: "assistant";
}) | (SystemMessage & {
    role: "system";
}) | (ToolMessage & {
    role: "tool";
}) | (UserMessage & {
    role: "user";
});
/**
 * Chat to classify
 */
export type ChatModerationRequestInputs = Array<(AssistantMessage & {
    role: "assistant";
}) | (SystemMessage & {
    role: "system";
}) | (ToolMessage & {
    role: "tool";
}) | (UserMessage & {
    role: "user";
})> | Array<Array<(AssistantMessage & {
    role: "assistant";
}) | (SystemMessage & {
    role: "system";
}) | (ToolMessage & {
    role: "tool";
}) | (UserMessage & {
    role: "user";
})>>;
export type ChatModerationRequest = {
    /**
     * Chat to classify
     */
    inputs: Array<(AssistantMessage & {
        role: "assistant";
    }) | (SystemMessage & {
        role: "system";
    }) | (ToolMessage & {
        role: "tool";
    }) | (UserMessage & {
        role: "user";
    })> | Array<Array<(AssistantMessage & {
        role: "assistant";
    }) | (SystemMessage & {
        role: "system";
    }) | (ToolMessage & {
        role: "tool";
    }) | (UserMessage & {
        role: "user";
    })>>;
    model: string;
};
/** @internal */
export type Two$Outbound = (AssistantMessage$Outbound & {
    role: "assistant";
}) | (SystemMessage$Outbound & {
    role: "system";
}) | (ToolMessage$Outbound & {
    role: "tool";
}) | (UserMessage$Outbound & {
    role: "user";
});
/** @internal */
export declare const Two$outboundSchema: z.ZodType<Two$Outbound, z.ZodTypeDef, Two>;
export declare function twoToJSON(two: Two): string;
/** @internal */
export type One$Outbound = (AssistantMessage$Outbound & {
    role: "assistant";
}) | (SystemMessage$Outbound & {
    role: "system";
}) | (ToolMessage$Outbound & {
    role: "tool";
}) | (UserMessage$Outbound & {
    role: "user";
});
/** @internal */
export declare const One$outboundSchema: z.ZodType<One$Outbound, z.ZodTypeDef, One>;
export declare function oneToJSON(one: One): string;
/** @internal */
export type ChatModerationRequestInputs$Outbound = Array<(AssistantMessage$Outbound & {
    role: "assistant";
}) | (SystemMessage$Outbound & {
    role: "system";
}) | (ToolMessage$Outbound & {
    role: "tool";
}) | (UserMessage$Outbound & {
    role: "user";
})> | Array<Array<(AssistantMessage$Outbound & {
    role: "assistant";
}) | (SystemMessage$Outbound & {
    role: "system";
}) | (ToolMessage$Outbound & {
    role: "tool";
}) | (UserMessage$Outbound & {
    role: "user";
})>>;
/** @internal */
export declare const ChatModerationRequestInputs$outboundSchema: z.ZodType<ChatModerationRequestInputs$Outbound, z.ZodTypeDef, ChatModerationRequestInputs>;
export declare function chatModerationRequestInputsToJSON(chatModerationRequestInputs: ChatModerationRequestInputs): string;
/** @internal */
export type ChatModerationRequest$Outbound = {
    input: Array<(AssistantMessage$Outbound & {
        role: "assistant";
    }) | (SystemMessage$Outbound & {
        role: "system";
    }) | (ToolMessage$Outbound & {
        role: "tool";
    }) | (UserMessage$Outbound & {
        role: "user";
    })> | Array<Array<(AssistantMessage$Outbound & {
        role: "assistant";
    }) | (SystemMessage$Outbound & {
        role: "system";
    }) | (ToolMessage$Outbound & {
        role: "tool";
    }) | (UserMessage$Outbound & {
        role: "user";
    })>>;
    model: string;
};
/** @internal */
export declare const ChatModerationRequest$outboundSchema: z.ZodType<ChatModerationRequest$Outbound, z.ZodTypeDef, ChatModerationRequest>;
export declare function chatModerationRequestToJSON(chatModerationRequest: ChatModerationRequest): string;
//# sourceMappingURL=chatmoderationrequest.d.ts.map