import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FunctionCallEntryArguments, FunctionCallEntryArguments$Outbound } from "./functioncallentryarguments.js";
export declare const FunctionCallEntryObject: {
    readonly Entry: "entry";
};
export type FunctionCallEntryObject = ClosedEnum<typeof FunctionCallEntryObject>;
export declare const FunctionCallEntryType: {
    readonly FunctionCall: "function.call";
};
export type FunctionCallEntryType = ClosedEnum<typeof FunctionCallEntryType>;
export type FunctionCallEntry = {
    object?: FunctionCallEntryObject | undefined;
    type?: FunctionCallEntryType | undefined;
    createdAt?: Date | undefined;
    completedAt?: Date | null | undefined;
    id?: string | undefined;
    toolCallId: string;
    name: string;
    arguments: FunctionCallEntryArguments;
};
/** @internal */
export declare const FunctionCallEntryObject$inboundSchema: z.ZodNativeEnum<typeof FunctionCallEntryObject>;
/** @internal */
export declare const FunctionCallEntryObject$outboundSchema: z.ZodNativeEnum<typeof FunctionCallEntryObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FunctionCallEntryObject$ {
    /** @deprecated use `FunctionCallEntryObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Entry: "entry";
    }>;
    /** @deprecated use `FunctionCallEntryObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Entry: "entry";
    }>;
}
/** @internal */
export declare const FunctionCallEntryType$inboundSchema: z.ZodNativeEnum<typeof FunctionCallEntryType>;
/** @internal */
export declare const FunctionCallEntryType$outboundSchema: z.ZodNativeEnum<typeof FunctionCallEntryType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FunctionCallEntryType$ {
    /** @deprecated use `FunctionCallEntryType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly FunctionCall: "function.call";
    }>;
    /** @deprecated use `FunctionCallEntryType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly FunctionCall: "function.call";
    }>;
}
/** @internal */
export declare const FunctionCallEntry$inboundSchema: z.ZodType<FunctionCallEntry, z.ZodTypeDef, unknown>;
/** @internal */
export type FunctionCallEntry$Outbound = {
    object: string;
    type: string;
    created_at?: string | undefined;
    completed_at?: string | null | undefined;
    id?: string | undefined;
    tool_call_id: string;
    name: string;
    arguments: FunctionCallEntryArguments$Outbound;
};
/** @internal */
export declare const FunctionCallEntry$outboundSchema: z.ZodType<FunctionCallEntry$Outbound, z.ZodTypeDef, FunctionCallEntry>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FunctionCallEntry$ {
    /** @deprecated use `FunctionCallEntry$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FunctionCallEntry, z.ZodTypeDef, unknown>;
    /** @deprecated use `FunctionCallEntry$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FunctionCallEntry$Outbound, z.ZodTypeDef, FunctionCallEntry>;
    /** @deprecated use `FunctionCallEntry$Outbound` instead. */
    type Outbound = FunctionCallEntry$Outbound;
}
export declare function functionCallEntryToJSON(functionCallEntry: FunctionCallEntry): string;
export declare function functionCallEntryFromJSON(jsonString: string): SafeParseResult<FunctionCallEntry, SDKValidationError>;
//# sourceMappingURL=functioncallentry.d.ts.map