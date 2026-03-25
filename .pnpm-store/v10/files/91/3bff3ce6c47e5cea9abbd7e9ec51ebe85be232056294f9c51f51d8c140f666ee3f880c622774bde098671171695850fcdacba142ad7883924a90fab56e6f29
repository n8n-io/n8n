import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type ModerationObject = {
    /**
     * Moderation result thresholds
     */
    categories?: {
        [k: string]: boolean;
    } | undefined;
    /**
     * Moderation result
     */
    categoryScores?: {
        [k: string]: number;
    } | undefined;
};
/** @internal */
export declare const ModerationObject$inboundSchema: z.ZodType<ModerationObject, z.ZodTypeDef, unknown>;
/** @internal */
export type ModerationObject$Outbound = {
    categories?: {
        [k: string]: boolean;
    } | undefined;
    category_scores?: {
        [k: string]: number;
    } | undefined;
};
/** @internal */
export declare const ModerationObject$outboundSchema: z.ZodType<ModerationObject$Outbound, z.ZodTypeDef, ModerationObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ModerationObject$ {
    /** @deprecated use `ModerationObject$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ModerationObject, z.ZodTypeDef, unknown>;
    /** @deprecated use `ModerationObject$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ModerationObject$Outbound, z.ZodTypeDef, ModerationObject>;
    /** @deprecated use `ModerationObject$Outbound` instead. */
    type Outbound = ModerationObject$Outbound;
}
export declare function moderationObjectToJSON(moderationObject: ModerationObject): string;
export declare function moderationObjectFromJSON(jsonString: string): SafeParseResult<ModerationObject, SDKValidationError>;
//# sourceMappingURL=moderationobject.d.ts.map