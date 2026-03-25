import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { BuiltInConnectors } from "./builtinconnectors.js";
export declare const ToolExecutionDoneEventType: {
    readonly ToolExecutionDone: "tool.execution.done";
};
export type ToolExecutionDoneEventType = ClosedEnum<typeof ToolExecutionDoneEventType>;
export type ToolExecutionDoneEvent = {
    type?: ToolExecutionDoneEventType | undefined;
    createdAt?: Date | undefined;
    outputIndex?: number | undefined;
    id: string;
    name: BuiltInConnectors;
    info?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const ToolExecutionDoneEventType$inboundSchema: z.ZodNativeEnum<typeof ToolExecutionDoneEventType>;
/** @internal */
export declare const ToolExecutionDoneEventType$outboundSchema: z.ZodNativeEnum<typeof ToolExecutionDoneEventType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ToolExecutionDoneEventType$ {
    /** @deprecated use `ToolExecutionDoneEventType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly ToolExecutionDone: "tool.execution.done";
    }>;
    /** @deprecated use `ToolExecutionDoneEventType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly ToolExecutionDone: "tool.execution.done";
    }>;
}
/** @internal */
export declare const ToolExecutionDoneEvent$inboundSchema: z.ZodType<ToolExecutionDoneEvent, z.ZodTypeDef, unknown>;
/** @internal */
export type ToolExecutionDoneEvent$Outbound = {
    type: string;
    created_at?: string | undefined;
    output_index: number;
    id: string;
    name: string;
    info?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const ToolExecutionDoneEvent$outboundSchema: z.ZodType<ToolExecutionDoneEvent$Outbound, z.ZodTypeDef, ToolExecutionDoneEvent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ToolExecutionDoneEvent$ {
    /** @deprecated use `ToolExecutionDoneEvent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ToolExecutionDoneEvent, z.ZodTypeDef, unknown>;
    /** @deprecated use `ToolExecutionDoneEvent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ToolExecutionDoneEvent$Outbound, z.ZodTypeDef, ToolExecutionDoneEvent>;
    /** @deprecated use `ToolExecutionDoneEvent$Outbound` instead. */
    type Outbound = ToolExecutionDoneEvent$Outbound;
}
export declare function toolExecutionDoneEventToJSON(toolExecutionDoneEvent: ToolExecutionDoneEvent): string;
export declare function toolExecutionDoneEventFromJSON(jsonString: string): SafeParseResult<ToolExecutionDoneEvent, SDKValidationError>;
//# sourceMappingURL=toolexecutiondoneevent.d.ts.map