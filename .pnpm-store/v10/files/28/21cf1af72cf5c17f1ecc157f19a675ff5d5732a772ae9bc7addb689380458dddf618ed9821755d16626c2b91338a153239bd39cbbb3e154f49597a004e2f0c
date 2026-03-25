import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const FunctionCallEventType: {
    readonly FunctionCallDelta: "function.call.delta";
};
export type FunctionCallEventType = ClosedEnum<typeof FunctionCallEventType>;
export type FunctionCallEvent = {
    type?: FunctionCallEventType | undefined;
    createdAt?: Date | undefined;
    outputIndex?: number | undefined;
    id: string;
    name: string;
    toolCallId: string;
    arguments: string;
};
/** @internal */
export declare const FunctionCallEventType$inboundSchema: z.ZodNativeEnum<typeof FunctionCallEventType>;
/** @internal */
export declare const FunctionCallEventType$outboundSchema: z.ZodNativeEnum<typeof FunctionCallEventType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FunctionCallEventType$ {
    /** @deprecated use `FunctionCallEventType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly FunctionCallDelta: "function.call.delta";
    }>;
    /** @deprecated use `FunctionCallEventType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly FunctionCallDelta: "function.call.delta";
    }>;
}
/** @internal */
export declare const FunctionCallEvent$inboundSchema: z.ZodType<FunctionCallEvent, z.ZodTypeDef, unknown>;
/** @internal */
export type FunctionCallEvent$Outbound = {
    type: string;
    created_at?: string | undefined;
    output_index: number;
    id: string;
    name: string;
    tool_call_id: string;
    arguments: string;
};
/** @internal */
export declare const FunctionCallEvent$outboundSchema: z.ZodType<FunctionCallEvent$Outbound, z.ZodTypeDef, FunctionCallEvent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FunctionCallEvent$ {
    /** @deprecated use `FunctionCallEvent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FunctionCallEvent, z.ZodTypeDef, unknown>;
    /** @deprecated use `FunctionCallEvent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FunctionCallEvent$Outbound, z.ZodTypeDef, FunctionCallEvent>;
    /** @deprecated use `FunctionCallEvent$Outbound` instead. */
    type Outbound = FunctionCallEvent$Outbound;
}
export declare function functionCallEventToJSON(functionCallEvent: FunctionCallEvent): string;
export declare function functionCallEventFromJSON(jsonString: string): SafeParseResult<FunctionCallEvent, SDKValidationError>;
//# sourceMappingURL=functioncallevent.d.ts.map