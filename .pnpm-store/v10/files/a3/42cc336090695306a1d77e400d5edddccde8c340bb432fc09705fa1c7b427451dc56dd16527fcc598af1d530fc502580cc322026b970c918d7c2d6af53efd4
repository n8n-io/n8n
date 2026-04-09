import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FunctionCallEntryArguments, FunctionCallEntryArguments$Outbound } from "./functioncallentryarguments.js";
export declare const ConfirmationStatus: {
    readonly Pending: "pending";
    readonly Allowed: "allowed";
    readonly Denied: "denied";
};
export type ConfirmationStatus = ClosedEnum<typeof ConfirmationStatus>;
export type FunctionCallEntry = {
    object?: "entry" | undefined;
    type?: "function.call" | undefined;
    createdAt?: Date | undefined;
    completedAt?: Date | null | undefined;
    agentId?: string | null | undefined;
    model?: string | null | undefined;
    id?: string | undefined;
    toolCallId: string;
    name: string;
    arguments: FunctionCallEntryArguments;
    confirmationStatus?: ConfirmationStatus | null | undefined;
};
/** @internal */
export declare const ConfirmationStatus$inboundSchema: z.ZodNativeEnum<typeof ConfirmationStatus>;
/** @internal */
export declare const ConfirmationStatus$outboundSchema: z.ZodNativeEnum<typeof ConfirmationStatus>;
/** @internal */
export declare const FunctionCallEntry$inboundSchema: z.ZodType<FunctionCallEntry, z.ZodTypeDef, unknown>;
/** @internal */
export type FunctionCallEntry$Outbound = {
    object: "entry";
    type: "function.call";
    created_at?: string | undefined;
    completed_at?: string | null | undefined;
    agent_id?: string | null | undefined;
    model?: string | null | undefined;
    id?: string | undefined;
    tool_call_id: string;
    name: string;
    arguments: FunctionCallEntryArguments$Outbound;
    confirmation_status?: string | null | undefined;
};
/** @internal */
export declare const FunctionCallEntry$outboundSchema: z.ZodType<FunctionCallEntry$Outbound, z.ZodTypeDef, FunctionCallEntry>;
export declare function functionCallEntryToJSON(functionCallEntry: FunctionCallEntry): string;
export declare function functionCallEntryFromJSON(jsonString: string): SafeParseResult<FunctionCallEntry, SDKValidationError>;
//# sourceMappingURL=functioncallentry.d.ts.map