import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { BuiltInConnectors } from "./builtinconnectors.js";
export declare const ToolExecutionDeltaEventType: {
    readonly ToolExecutionDelta: "tool.execution.delta";
};
export type ToolExecutionDeltaEventType = ClosedEnum<typeof ToolExecutionDeltaEventType>;
export type ToolExecutionDeltaEvent = {
    type?: ToolExecutionDeltaEventType | undefined;
    createdAt?: Date | undefined;
    outputIndex?: number | undefined;
    id: string;
    name: BuiltInConnectors;
    arguments: string;
};
/** @internal */
export declare const ToolExecutionDeltaEventType$inboundSchema: z.ZodNativeEnum<typeof ToolExecutionDeltaEventType>;
/** @internal */
export declare const ToolExecutionDeltaEventType$outboundSchema: z.ZodNativeEnum<typeof ToolExecutionDeltaEventType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ToolExecutionDeltaEventType$ {
    /** @deprecated use `ToolExecutionDeltaEventType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly ToolExecutionDelta: "tool.execution.delta";
    }>;
    /** @deprecated use `ToolExecutionDeltaEventType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly ToolExecutionDelta: "tool.execution.delta";
    }>;
}
/** @internal */
export declare const ToolExecutionDeltaEvent$inboundSchema: z.ZodType<ToolExecutionDeltaEvent, z.ZodTypeDef, unknown>;
/** @internal */
export type ToolExecutionDeltaEvent$Outbound = {
    type: string;
    created_at?: string | undefined;
    output_index: number;
    id: string;
    name: string;
    arguments: string;
};
/** @internal */
export declare const ToolExecutionDeltaEvent$outboundSchema: z.ZodType<ToolExecutionDeltaEvent$Outbound, z.ZodTypeDef, ToolExecutionDeltaEvent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ToolExecutionDeltaEvent$ {
    /** @deprecated use `ToolExecutionDeltaEvent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ToolExecutionDeltaEvent, z.ZodTypeDef, unknown>;
    /** @deprecated use `ToolExecutionDeltaEvent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ToolExecutionDeltaEvent$Outbound, z.ZodTypeDef, ToolExecutionDeltaEvent>;
    /** @deprecated use `ToolExecutionDeltaEvent$Outbound` instead. */
    type Outbound = ToolExecutionDeltaEvent$Outbound;
}
export declare function toolExecutionDeltaEventToJSON(toolExecutionDeltaEvent: ToolExecutionDeltaEvent): string;
export declare function toolExecutionDeltaEventFromJSON(jsonString: string): SafeParseResult<ToolExecutionDeltaEvent, SDKValidationError>;
//# sourceMappingURL=toolexecutiondeltaevent.d.ts.map