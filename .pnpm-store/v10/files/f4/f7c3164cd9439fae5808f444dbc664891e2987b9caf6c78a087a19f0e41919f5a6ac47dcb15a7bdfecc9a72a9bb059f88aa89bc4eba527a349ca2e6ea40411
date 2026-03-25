import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { AgentHandoffEntry, AgentHandoffEntry$Outbound } from "./agenthandoffentry.js";
import { FunctionCallEntry, FunctionCallEntry$Outbound } from "./functioncallentry.js";
import { FunctionResultEntry, FunctionResultEntry$Outbound } from "./functionresultentry.js";
import { MessageInputEntry, MessageInputEntry$Outbound } from "./messageinputentry.js";
import { MessageOutputEntry, MessageOutputEntry$Outbound } from "./messageoutputentry.js";
import { ToolExecutionEntry, ToolExecutionEntry$Outbound } from "./toolexecutionentry.js";
export type InputEntries = AgentHandoffEntry | FunctionCallEntry | MessageInputEntry | FunctionResultEntry | ToolExecutionEntry | MessageOutputEntry;
/** @internal */
export declare const InputEntries$inboundSchema: z.ZodType<InputEntries, z.ZodTypeDef, unknown>;
/** @internal */
export type InputEntries$Outbound = AgentHandoffEntry$Outbound | FunctionCallEntry$Outbound | MessageInputEntry$Outbound | FunctionResultEntry$Outbound | ToolExecutionEntry$Outbound | MessageOutputEntry$Outbound;
/** @internal */
export declare const InputEntries$outboundSchema: z.ZodType<InputEntries$Outbound, z.ZodTypeDef, InputEntries>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace InputEntries$ {
    /** @deprecated use `InputEntries$inboundSchema` instead. */
    const inboundSchema: z.ZodType<InputEntries, z.ZodTypeDef, unknown>;
    /** @deprecated use `InputEntries$outboundSchema` instead. */
    const outboundSchema: z.ZodType<InputEntries$Outbound, z.ZodTypeDef, InputEntries>;
    /** @deprecated use `InputEntries$Outbound` instead. */
    type Outbound = InputEntries$Outbound;
}
export declare function inputEntriesToJSON(inputEntries: InputEntries): string;
export declare function inputEntriesFromJSON(jsonString: string): SafeParseResult<InputEntries, SDKValidationError>;
//# sourceMappingURL=inputentries.d.ts.map