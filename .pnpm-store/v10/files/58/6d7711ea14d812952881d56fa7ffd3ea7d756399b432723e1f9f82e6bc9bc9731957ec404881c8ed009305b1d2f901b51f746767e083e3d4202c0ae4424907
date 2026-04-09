import * as z from "zod/v3";
import { SystemMessageContentChunks, SystemMessageContentChunks$Outbound } from "./systemmessagecontentchunks.js";
export type SystemMessageContent = string | Array<SystemMessageContentChunks>;
export type SystemMessage = {
    role?: "system" | undefined;
    content: string | Array<SystemMessageContentChunks>;
};
/** @internal */
export type SystemMessageContent$Outbound = string | Array<SystemMessageContentChunks$Outbound>;
/** @internal */
export declare const SystemMessageContent$outboundSchema: z.ZodType<SystemMessageContent$Outbound, z.ZodTypeDef, SystemMessageContent>;
export declare function systemMessageContentToJSON(systemMessageContent: SystemMessageContent): string;
/** @internal */
export type SystemMessage$Outbound = {
    role: "system";
    content: string | Array<SystemMessageContentChunks$Outbound>;
};
/** @internal */
export declare const SystemMessage$outboundSchema: z.ZodType<SystemMessage$Outbound, z.ZodTypeDef, SystemMessage>;
export declare function systemMessageToJSON(systemMessage: SystemMessage): string;
//# sourceMappingURL=systemmessage.d.ts.map