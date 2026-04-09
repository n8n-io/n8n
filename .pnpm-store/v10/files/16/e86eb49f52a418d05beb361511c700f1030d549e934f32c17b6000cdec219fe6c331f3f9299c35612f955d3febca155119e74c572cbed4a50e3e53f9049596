import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const FunctionCallEventConfirmationStatus: {
    readonly Pending: "pending";
    readonly Allowed: "allowed";
    readonly Denied: "denied";
};
export type FunctionCallEventConfirmationStatus = ClosedEnum<typeof FunctionCallEventConfirmationStatus>;
export type FunctionCallEvent = {
    type?: "function.call.delta" | undefined;
    createdAt?: Date | undefined;
    outputIndex: number | undefined;
    id: string;
    model?: string | null | undefined;
    agentId?: string | null | undefined;
    name: string;
    toolCallId: string;
    arguments: string;
    confirmationStatus?: FunctionCallEventConfirmationStatus | null | undefined;
};
/** @internal */
export declare const FunctionCallEventConfirmationStatus$inboundSchema: z.ZodNativeEnum<typeof FunctionCallEventConfirmationStatus>;
/** @internal */
export declare const FunctionCallEvent$inboundSchema: z.ZodType<FunctionCallEvent, z.ZodTypeDef, unknown>;
export declare function functionCallEventFromJSON(jsonString: string): SafeParseResult<FunctionCallEvent, SDKValidationError>;
//# sourceMappingURL=functioncallevent.d.ts.map