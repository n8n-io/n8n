import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { BuiltInConnectors } from "./builtinconnectors.js";
export type ToolExecutionDeltaEventName = BuiltInConnectors | string;
export type ToolExecutionDeltaEvent = {
    type?: "tool.execution.delta" | undefined;
    createdAt?: Date | undefined;
    outputIndex: number | undefined;
    id: string;
    name: BuiltInConnectors | string;
    arguments: string;
};
/** @internal */
export declare const ToolExecutionDeltaEventName$inboundSchema: z.ZodType<ToolExecutionDeltaEventName, z.ZodTypeDef, unknown>;
export declare function toolExecutionDeltaEventNameFromJSON(jsonString: string): SafeParseResult<ToolExecutionDeltaEventName, SDKValidationError>;
/** @internal */
export declare const ToolExecutionDeltaEvent$inboundSchema: z.ZodType<ToolExecutionDeltaEvent, z.ZodTypeDef, unknown>;
export declare function toolExecutionDeltaEventFromJSON(jsonString: string): SafeParseResult<ToolExecutionDeltaEvent, SDKValidationError>;
//# sourceMappingURL=toolexecutiondeltaevent.d.ts.map