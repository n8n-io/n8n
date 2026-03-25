import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const FunctionResultEntryObject: {
    readonly Entry: "entry";
};
export type FunctionResultEntryObject = ClosedEnum<typeof FunctionResultEntryObject>;
export declare const FunctionResultEntryType: {
    readonly FunctionResult: "function.result";
};
export type FunctionResultEntryType = ClosedEnum<typeof FunctionResultEntryType>;
export type FunctionResultEntry = {
    object?: FunctionResultEntryObject | undefined;
    type?: FunctionResultEntryType | undefined;
    createdAt?: Date | undefined;
    completedAt?: Date | null | undefined;
    id?: string | undefined;
    toolCallId: string;
    result: string;
};
/** @internal */
export declare const FunctionResultEntryObject$inboundSchema: z.ZodNativeEnum<typeof FunctionResultEntryObject>;
/** @internal */
export declare const FunctionResultEntryObject$outboundSchema: z.ZodNativeEnum<typeof FunctionResultEntryObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FunctionResultEntryObject$ {
    /** @deprecated use `FunctionResultEntryObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Entry: "entry";
    }>;
    /** @deprecated use `FunctionResultEntryObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Entry: "entry";
    }>;
}
/** @internal */
export declare const FunctionResultEntryType$inboundSchema: z.ZodNativeEnum<typeof FunctionResultEntryType>;
/** @internal */
export declare const FunctionResultEntryType$outboundSchema: z.ZodNativeEnum<typeof FunctionResultEntryType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FunctionResultEntryType$ {
    /** @deprecated use `FunctionResultEntryType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly FunctionResult: "function.result";
    }>;
    /** @deprecated use `FunctionResultEntryType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly FunctionResult: "function.result";
    }>;
}
/** @internal */
export declare const FunctionResultEntry$inboundSchema: z.ZodType<FunctionResultEntry, z.ZodTypeDef, unknown>;
/** @internal */
export type FunctionResultEntry$Outbound = {
    object: string;
    type: string;
    created_at?: string | undefined;
    completed_at?: string | null | undefined;
    id?: string | undefined;
    tool_call_id: string;
    result: string;
};
/** @internal */
export declare const FunctionResultEntry$outboundSchema: z.ZodType<FunctionResultEntry$Outbound, z.ZodTypeDef, FunctionResultEntry>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FunctionResultEntry$ {
    /** @deprecated use `FunctionResultEntry$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FunctionResultEntry, z.ZodTypeDef, unknown>;
    /** @deprecated use `FunctionResultEntry$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FunctionResultEntry$Outbound, z.ZodTypeDef, FunctionResultEntry>;
    /** @deprecated use `FunctionResultEntry$Outbound` instead. */
    type Outbound = FunctionResultEntry$Outbound;
}
export declare function functionResultEntryToJSON(functionResultEntry: FunctionResultEntry): string;
export declare function functionResultEntryFromJSON(jsonString: string): SafeParseResult<FunctionResultEntry, SDKValidationError>;
//# sourceMappingURL=functionresultentry.d.ts.map