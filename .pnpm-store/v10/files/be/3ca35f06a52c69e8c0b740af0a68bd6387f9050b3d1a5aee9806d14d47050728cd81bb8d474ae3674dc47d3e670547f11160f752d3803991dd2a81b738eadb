import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { BuiltInConnectors } from "./builtinconnectors.js";
export declare const ToolExecutionEntryObject: {
    readonly Entry: "entry";
};
export type ToolExecutionEntryObject = ClosedEnum<typeof ToolExecutionEntryObject>;
export declare const ToolExecutionEntryType: {
    readonly ToolExecution: "tool.execution";
};
export type ToolExecutionEntryType = ClosedEnum<typeof ToolExecutionEntryType>;
export type ToolExecutionEntry = {
    object?: ToolExecutionEntryObject | undefined;
    type?: ToolExecutionEntryType | undefined;
    createdAt?: Date | undefined;
    completedAt?: Date | null | undefined;
    id?: string | undefined;
    name: BuiltInConnectors;
    arguments: string;
    info?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const ToolExecutionEntryObject$inboundSchema: z.ZodNativeEnum<typeof ToolExecutionEntryObject>;
/** @internal */
export declare const ToolExecutionEntryObject$outboundSchema: z.ZodNativeEnum<typeof ToolExecutionEntryObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ToolExecutionEntryObject$ {
    /** @deprecated use `ToolExecutionEntryObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Entry: "entry";
    }>;
    /** @deprecated use `ToolExecutionEntryObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Entry: "entry";
    }>;
}
/** @internal */
export declare const ToolExecutionEntryType$inboundSchema: z.ZodNativeEnum<typeof ToolExecutionEntryType>;
/** @internal */
export declare const ToolExecutionEntryType$outboundSchema: z.ZodNativeEnum<typeof ToolExecutionEntryType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ToolExecutionEntryType$ {
    /** @deprecated use `ToolExecutionEntryType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly ToolExecution: "tool.execution";
    }>;
    /** @deprecated use `ToolExecutionEntryType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly ToolExecution: "tool.execution";
    }>;
}
/** @internal */
export declare const ToolExecutionEntry$inboundSchema: z.ZodType<ToolExecutionEntry, z.ZodTypeDef, unknown>;
/** @internal */
export type ToolExecutionEntry$Outbound = {
    object: string;
    type: string;
    created_at?: string | undefined;
    completed_at?: string | null | undefined;
    id?: string | undefined;
    name: string;
    arguments: string;
    info?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const ToolExecutionEntry$outboundSchema: z.ZodType<ToolExecutionEntry$Outbound, z.ZodTypeDef, ToolExecutionEntry>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ToolExecutionEntry$ {
    /** @deprecated use `ToolExecutionEntry$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ToolExecutionEntry, z.ZodTypeDef, unknown>;
    /** @deprecated use `ToolExecutionEntry$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ToolExecutionEntry$Outbound, z.ZodTypeDef, ToolExecutionEntry>;
    /** @deprecated use `ToolExecutionEntry$Outbound` instead. */
    type Outbound = ToolExecutionEntry$Outbound;
}
export declare function toolExecutionEntryToJSON(toolExecutionEntry: ToolExecutionEntry): string;
export declare function toolExecutionEntryFromJSON(jsonString: string): SafeParseResult<ToolExecutionEntry, SDKValidationError>;
//# sourceMappingURL=toolexecutionentry.d.ts.map