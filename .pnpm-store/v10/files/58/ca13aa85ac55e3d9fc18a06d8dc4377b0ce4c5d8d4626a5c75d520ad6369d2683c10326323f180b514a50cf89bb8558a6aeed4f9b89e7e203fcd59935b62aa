import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type FunctionResultEntry = {
    object?: "entry" | undefined;
    type?: "function.result" | undefined;
    createdAt?: Date | undefined;
    completedAt?: Date | null | undefined;
    id?: string | undefined;
    toolCallId: string;
    result: string;
};
/** @internal */
export declare const FunctionResultEntry$inboundSchema: z.ZodType<FunctionResultEntry, z.ZodTypeDef, unknown>;
/** @internal */
export type FunctionResultEntry$Outbound = {
    object: "entry";
    type: "function.result";
    created_at?: string | undefined;
    completed_at?: string | null | undefined;
    id?: string | undefined;
    tool_call_id: string;
    result: string;
};
/** @internal */
export declare const FunctionResultEntry$outboundSchema: z.ZodType<FunctionResultEntry$Outbound, z.ZodTypeDef, FunctionResultEntry>;
export declare function functionResultEntryToJSON(functionResultEntry: FunctionResultEntry): string;
export declare function functionResultEntryFromJSON(jsonString: string): SafeParseResult<FunctionResultEntry, SDKValidationError>;
//# sourceMappingURL=functionresultentry.d.ts.map