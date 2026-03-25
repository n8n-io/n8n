import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { SystemMessageContentChunks, SystemMessageContentChunks$Outbound } from "./systemmessagecontentchunks.js";
export type SystemMessageContent = string | Array<SystemMessageContentChunks>;
export declare const Role: {
    readonly System: "system";
};
export type Role = ClosedEnum<typeof Role>;
export type SystemMessage = {
    content: string | Array<SystemMessageContentChunks>;
    role?: Role | undefined;
};
/** @internal */
export declare const SystemMessageContent$inboundSchema: z.ZodType<SystemMessageContent, z.ZodTypeDef, unknown>;
/** @internal */
export type SystemMessageContent$Outbound = string | Array<SystemMessageContentChunks$Outbound>;
/** @internal */
export declare const SystemMessageContent$outboundSchema: z.ZodType<SystemMessageContent$Outbound, z.ZodTypeDef, SystemMessageContent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace SystemMessageContent$ {
    /** @deprecated use `SystemMessageContent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<SystemMessageContent, z.ZodTypeDef, unknown>;
    /** @deprecated use `SystemMessageContent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<SystemMessageContent$Outbound, z.ZodTypeDef, SystemMessageContent>;
    /** @deprecated use `SystemMessageContent$Outbound` instead. */
    type Outbound = SystemMessageContent$Outbound;
}
export declare function systemMessageContentToJSON(systemMessageContent: SystemMessageContent): string;
export declare function systemMessageContentFromJSON(jsonString: string): SafeParseResult<SystemMessageContent, SDKValidationError>;
/** @internal */
export declare const Role$inboundSchema: z.ZodNativeEnum<typeof Role>;
/** @internal */
export declare const Role$outboundSchema: z.ZodNativeEnum<typeof Role>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Role$ {
    /** @deprecated use `Role$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly System: "system";
    }>;
    /** @deprecated use `Role$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly System: "system";
    }>;
}
/** @internal */
export declare const SystemMessage$inboundSchema: z.ZodType<SystemMessage, z.ZodTypeDef, unknown>;
/** @internal */
export type SystemMessage$Outbound = {
    content: string | Array<SystemMessageContentChunks$Outbound>;
    role: string;
};
/** @internal */
export declare const SystemMessage$outboundSchema: z.ZodType<SystemMessage$Outbound, z.ZodTypeDef, SystemMessage>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace SystemMessage$ {
    /** @deprecated use `SystemMessage$inboundSchema` instead. */
    const inboundSchema: z.ZodType<SystemMessage, z.ZodTypeDef, unknown>;
    /** @deprecated use `SystemMessage$outboundSchema` instead. */
    const outboundSchema: z.ZodType<SystemMessage$Outbound, z.ZodTypeDef, SystemMessage>;
    /** @deprecated use `SystemMessage$Outbound` instead. */
    type Outbound = SystemMessage$Outbound;
}
export declare function systemMessageToJSON(systemMessage: SystemMessage): string;
export declare function systemMessageFromJSON(jsonString: string): SafeParseResult<SystemMessage, SDKValidationError>;
//# sourceMappingURL=systemmessage.d.ts.map