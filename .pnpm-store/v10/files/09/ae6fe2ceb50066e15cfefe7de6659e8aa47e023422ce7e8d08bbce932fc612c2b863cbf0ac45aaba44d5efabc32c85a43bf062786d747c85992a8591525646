import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { InputEntries, InputEntries$Outbound } from "./inputentries.js";
export type ConversationInputs = string | Array<InputEntries>;
/** @internal */
export declare const ConversationInputs$inboundSchema: z.ZodType<ConversationInputs, z.ZodTypeDef, unknown>;
/** @internal */
export type ConversationInputs$Outbound = string | Array<InputEntries$Outbound>;
/** @internal */
export declare const ConversationInputs$outboundSchema: z.ZodType<ConversationInputs$Outbound, z.ZodTypeDef, ConversationInputs>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationInputs$ {
    /** @deprecated use `ConversationInputs$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ConversationInputs, z.ZodTypeDef, unknown>;
    /** @deprecated use `ConversationInputs$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ConversationInputs$Outbound, z.ZodTypeDef, ConversationInputs>;
    /** @deprecated use `ConversationInputs$Outbound` instead. */
    type Outbound = ConversationInputs$Outbound;
}
export declare function conversationInputsToJSON(conversationInputs: ConversationInputs): string;
export declare function conversationInputsFromJSON(jsonString: string): SafeParseResult<ConversationInputs, SDKValidationError>;
//# sourceMappingURL=conversationinputs.d.ts.map