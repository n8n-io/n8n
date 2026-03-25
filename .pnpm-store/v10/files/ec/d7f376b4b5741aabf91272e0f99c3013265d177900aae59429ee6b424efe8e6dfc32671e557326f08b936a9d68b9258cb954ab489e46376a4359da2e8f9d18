import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { BuiltInConnectors } from "./builtinconnectors.js";
export declare const ToolExecutionStartedEventType: {
    readonly ToolExecutionStarted: "tool.execution.started";
};
export type ToolExecutionStartedEventType = ClosedEnum<typeof ToolExecutionStartedEventType>;
export type ToolExecutionStartedEvent = {
    type?: ToolExecutionStartedEventType | undefined;
    createdAt?: Date | undefined;
    outputIndex?: number | undefined;
    id: string;
    name: BuiltInConnectors;
    arguments: string;
};
/** @internal */
export declare const ToolExecutionStartedEventType$inboundSchema: z.ZodNativeEnum<typeof ToolExecutionStartedEventType>;
/** @internal */
export declare const ToolExecutionStartedEventType$outboundSchema: z.ZodNativeEnum<typeof ToolExecutionStartedEventType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ToolExecutionStartedEventType$ {
    /** @deprecated use `ToolExecutionStartedEventType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly ToolExecutionStarted: "tool.execution.started";
    }>;
    /** @deprecated use `ToolExecutionStartedEventType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly ToolExecutionStarted: "tool.execution.started";
    }>;
}
/** @internal */
export declare const ToolExecutionStartedEvent$inboundSchema: z.ZodType<ToolExecutionStartedEvent, z.ZodTypeDef, unknown>;
/** @internal */
export type ToolExecutionStartedEvent$Outbound = {
    type: string;
    created_at?: string | undefined;
    output_index: number;
    id: string;
    name: string;
    arguments: string;
};
/** @internal */
export declare const ToolExecutionStartedEvent$outboundSchema: z.ZodType<ToolExecutionStartedEvent$Outbound, z.ZodTypeDef, ToolExecutionStartedEvent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ToolExecutionStartedEvent$ {
    /** @deprecated use `ToolExecutionStartedEvent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ToolExecutionStartedEvent, z.ZodTypeDef, unknown>;
    /** @deprecated use `ToolExecutionStartedEvent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ToolExecutionStartedEvent$Outbound, z.ZodTypeDef, ToolExecutionStartedEvent>;
    /** @deprecated use `ToolExecutionStartedEvent$Outbound` instead. */
    type Outbound = ToolExecutionStartedEvent$Outbound;
}
export declare function toolExecutionStartedEventToJSON(toolExecutionStartedEvent: ToolExecutionStartedEvent): string;
export declare function toolExecutionStartedEventFromJSON(jsonString: string): SafeParseResult<ToolExecutionStartedEvent, SDKValidationError>;
//# sourceMappingURL=toolexecutionstartedevent.d.ts.map