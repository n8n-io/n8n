import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { Inputs, Inputs$Outbound } from "./inputs.js";
export type ChatClassificationRequest = {
    model: string;
    /**
     * Chat to classify
     */
    inputs: Inputs;
};
/** @internal */
export declare const ChatClassificationRequest$inboundSchema: z.ZodType<ChatClassificationRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type ChatClassificationRequest$Outbound = {
    model: string;
    input: Inputs$Outbound;
};
/** @internal */
export declare const ChatClassificationRequest$outboundSchema: z.ZodType<ChatClassificationRequest$Outbound, z.ZodTypeDef, ChatClassificationRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ChatClassificationRequest$ {
    /** @deprecated use `ChatClassificationRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ChatClassificationRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `ChatClassificationRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ChatClassificationRequest$Outbound, z.ZodTypeDef, ChatClassificationRequest>;
    /** @deprecated use `ChatClassificationRequest$Outbound` instead. */
    type Outbound = ChatClassificationRequest$Outbound;
}
export declare function chatClassificationRequestToJSON(chatClassificationRequest: ChatClassificationRequest): string;
export declare function chatClassificationRequestFromJSON(jsonString: string): SafeParseResult<ChatClassificationRequest, SDKValidationError>;
//# sourceMappingURL=chatclassificationrequest.d.ts.map