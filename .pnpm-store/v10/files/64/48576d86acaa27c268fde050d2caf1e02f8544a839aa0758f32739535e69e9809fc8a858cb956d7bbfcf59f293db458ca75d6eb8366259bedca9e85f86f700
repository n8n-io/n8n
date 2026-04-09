import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
export declare const Confirmation: {
    readonly Allow: "allow";
    readonly Deny: "deny";
};
export type Confirmation = ClosedEnum<typeof Confirmation>;
export type ToolCallConfirmation = {
    toolCallId: string;
    confirmation: Confirmation;
};
/** @internal */
export declare const Confirmation$outboundSchema: z.ZodNativeEnum<typeof Confirmation>;
/** @internal */
export type ToolCallConfirmation$Outbound = {
    tool_call_id: string;
    confirmation: string;
};
/** @internal */
export declare const ToolCallConfirmation$outboundSchema: z.ZodType<ToolCallConfirmation$Outbound, z.ZodTypeDef, ToolCallConfirmation>;
export declare function toolCallConfirmationToJSON(toolCallConfirmation: ToolCallConfirmation): string;
//# sourceMappingURL=toolcallconfirmation.d.ts.map