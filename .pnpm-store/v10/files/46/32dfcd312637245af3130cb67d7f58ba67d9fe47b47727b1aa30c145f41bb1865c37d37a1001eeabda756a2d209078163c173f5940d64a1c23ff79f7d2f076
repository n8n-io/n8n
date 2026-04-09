import * as z from "zod/v3";
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
export declare function moderationObjectFromJSON(jsonString: string): SafeParseResult<ModerationObject, SDKValidationError>;
//# sourceMappingURL=moderationobject.d.ts.map