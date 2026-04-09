import * as z from "zod/v3";
import { AgentHandoffEntry, AgentHandoffEntry$Outbound } from "./agenthandoffentry.js";
import { FunctionCallEntry, FunctionCallEntry$Outbound } from "./functioncallentry.js";
import { FunctionResultEntry, FunctionResultEntry$Outbound } from "./functionresultentry.js";
import { MessageInputEntry, MessageInputEntry$Outbound } from "./messageinputentry.js";
import { MessageOutputEntry, MessageOutputEntry$Outbound } from "./messageoutputentry.js";
import { ToolExecutionEntry, ToolExecutionEntry$Outbound } from "./toolexecutionentry.js";
export type InputEntries = AgentHandoffEntry | FunctionCallEntry | MessageInputEntry | FunctionResultEntry | ToolExecutionEntry | MessageOutputEntry;
/** @internal */
export type InputEntries$Outbound = AgentHandoffEntry$Outbound | FunctionCallEntry$Outbound | MessageInputEntry$Outbound | FunctionResultEntry$Outbound | ToolExecutionEntry$Outbound | MessageOutputEntry$Outbound;
/** @internal */
export declare const InputEntries$outboundSchema: z.ZodType<InputEntries$Outbound, z.ZodTypeDef, InputEntries>;
export declare function inputEntriesToJSON(inputEntries: InputEntries): string;
//# sourceMappingURL=inputentries.d.ts.map