import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { BuiltInConnectors } from "./builtinconnectors.js";
export type Name = BuiltInConnectors | string;
export type ToolExecutionEntry = {
    object?: "entry" | undefined;
    type?: "tool.execution" | undefined;
    createdAt?: Date | undefined;
    completedAt?: Date | null | undefined;
    agentId?: string | null | undefined;
    model?: string | null | undefined;
    id?: string | undefined;
    name: BuiltInConnectors | string;
    arguments: string;
    info?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const Name$inboundSchema: z.ZodType<Name, z.ZodTypeDef, unknown>;
/** @internal */
export type Name$Outbound = string | string;
/** @internal */
export declare const Name$outboundSchema: z.ZodType<Name$Outbound, z.ZodTypeDef, Name>;
export declare function nameToJSON(name: Name): string;
export declare function nameFromJSON(jsonString: string): SafeParseResult<Name, SDKValidationError>;
/** @internal */
export declare const ToolExecutionEntry$inboundSchema: z.ZodType<ToolExecutionEntry, z.ZodTypeDef, unknown>;
/** @internal */
export type ToolExecutionEntry$Outbound = {
    object: "entry";
    type: "tool.execution";
    created_at?: string | undefined;
    completed_at?: string | null | undefined;
    agent_id?: string | null | undefined;
    model?: string | null | undefined;
    id?: string | undefined;
    name: string | string;
    arguments: string;
    info?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const ToolExecutionEntry$outboundSchema: z.ZodType<ToolExecutionEntry$Outbound, z.ZodTypeDef, ToolExecutionEntry>;
export declare function toolExecutionEntryToJSON(toolExecutionEntry: ToolExecutionEntry): string;
export declare function toolExecutionEntryFromJSON(jsonString: string): SafeParseResult<ToolExecutionEntry, SDKValidationError>;
//# sourceMappingURL=toolexecutionentry.d.ts.map