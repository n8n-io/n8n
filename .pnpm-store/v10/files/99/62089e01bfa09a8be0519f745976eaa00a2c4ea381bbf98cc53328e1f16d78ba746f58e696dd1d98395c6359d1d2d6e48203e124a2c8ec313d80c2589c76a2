import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { MessageInputEntry, MessageInputEntry$Outbound } from "./messageinputentry.js";
import { MessageOutputEntry, MessageOutputEntry$Outbound } from "./messageoutputentry.js";
export type MessageEntries = MessageInputEntry | MessageOutputEntry;
/** @internal */
export declare const MessageEntries$inboundSchema: z.ZodType<MessageEntries, z.ZodTypeDef, unknown>;
/** @internal */
export type MessageEntries$Outbound = MessageInputEntry$Outbound | MessageOutputEntry$Outbound;
/** @internal */
export declare const MessageEntries$outboundSchema: z.ZodType<MessageEntries$Outbound, z.ZodTypeDef, MessageEntries>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace MessageEntries$ {
    /** @deprecated use `MessageEntries$inboundSchema` instead. */
    const inboundSchema: z.ZodType<MessageEntries, z.ZodTypeDef, unknown>;
    /** @deprecated use `MessageEntries$outboundSchema` instead. */
    const outboundSchema: z.ZodType<MessageEntries$Outbound, z.ZodTypeDef, MessageEntries>;
    /** @deprecated use `MessageEntries$Outbound` instead. */
    type Outbound = MessageEntries$Outbound;
}
export declare function messageEntriesToJSON(messageEntries: MessageEntries): string;
export declare function messageEntriesFromJSON(jsonString: string): SafeParseResult<MessageEntries, SDKValidationError>;
//# sourceMappingURL=messageentries.d.ts.map