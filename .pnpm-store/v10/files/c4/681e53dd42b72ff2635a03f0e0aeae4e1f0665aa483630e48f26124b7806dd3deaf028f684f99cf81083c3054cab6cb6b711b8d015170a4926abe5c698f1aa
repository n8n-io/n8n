import * as z from "zod";
import { OpenEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { DeltaMessage, DeltaMessage$Outbound } from "./deltamessage.js";
export declare const CompletionResponseStreamChoiceFinishReason: {
    readonly Stop: "stop";
    readonly Length: "length";
    readonly Error: "error";
    readonly ToolCalls: "tool_calls";
};
export type CompletionResponseStreamChoiceFinishReason = OpenEnum<typeof CompletionResponseStreamChoiceFinishReason>;
export type CompletionResponseStreamChoice = {
    index: number;
    delta: DeltaMessage;
    finishReason: CompletionResponseStreamChoiceFinishReason | null;
};
/** @internal */
export declare const CompletionResponseStreamChoiceFinishReason$inboundSchema: z.ZodType<CompletionResponseStreamChoiceFinishReason, z.ZodTypeDef, unknown>;
/** @internal */
export declare const CompletionResponseStreamChoiceFinishReason$outboundSchema: z.ZodType<CompletionResponseStreamChoiceFinishReason, z.ZodTypeDef, CompletionResponseStreamChoiceFinishReason>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace CompletionResponseStreamChoiceFinishReason$ {
    /** @deprecated use `CompletionResponseStreamChoiceFinishReason$inboundSchema` instead. */
    const inboundSchema: z.ZodType<CompletionResponseStreamChoiceFinishReason, z.ZodTypeDef, unknown>;
    /** @deprecated use `CompletionResponseStreamChoiceFinishReason$outboundSchema` instead. */
    const outboundSchema: z.ZodType<CompletionResponseStreamChoiceFinishReason, z.ZodTypeDef, CompletionResponseStreamChoiceFinishReason>;
}
/** @internal */
export declare const CompletionResponseStreamChoice$inboundSchema: z.ZodType<CompletionResponseStreamChoice, z.ZodTypeDef, unknown>;
/** @internal */
export type CompletionResponseStreamChoice$Outbound = {
    index: number;
    delta: DeltaMessage$Outbound;
    finish_reason: string | null;
};
/** @internal */
export declare const CompletionResponseStreamChoice$outboundSchema: z.ZodType<CompletionResponseStreamChoice$Outbound, z.ZodTypeDef, CompletionResponseStreamChoice>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace CompletionResponseStreamChoice$ {
    /** @deprecated use `CompletionResponseStreamChoice$inboundSchema` instead. */
    const inboundSchema: z.ZodType<CompletionResponseStreamChoice, z.ZodTypeDef, unknown>;
    /** @deprecated use `CompletionResponseStreamChoice$outboundSchema` instead. */
    const outboundSchema: z.ZodType<CompletionResponseStreamChoice$Outbound, z.ZodTypeDef, CompletionResponseStreamChoice>;
    /** @deprecated use `CompletionResponseStreamChoice$Outbound` instead. */
    type Outbound = CompletionResponseStreamChoice$Outbound;
}
export declare function completionResponseStreamChoiceToJSON(completionResponseStreamChoice: CompletionResponseStreamChoice): string;
export declare function completionResponseStreamChoiceFromJSON(jsonString: string): SafeParseResult<CompletionResponseStreamChoice, SDKValidationError>;
//# sourceMappingURL=completionresponsestreamchoice.d.ts.map