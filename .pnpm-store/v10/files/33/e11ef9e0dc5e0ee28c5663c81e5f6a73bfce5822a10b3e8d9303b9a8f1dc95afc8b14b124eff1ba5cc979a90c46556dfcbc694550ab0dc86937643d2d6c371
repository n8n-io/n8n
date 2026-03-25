import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ModerationObject, ModerationObject$Outbound } from "./moderationobject.js";
export type ModerationResponse = {
    id: string;
    model: string;
    results: Array<ModerationObject>;
};
/** @internal */
export declare const ModerationResponse$inboundSchema: z.ZodType<ModerationResponse, z.ZodTypeDef, unknown>;
/** @internal */
export type ModerationResponse$Outbound = {
    id: string;
    model: string;
    results: Array<ModerationObject$Outbound>;
};
/** @internal */
export declare const ModerationResponse$outboundSchema: z.ZodType<ModerationResponse$Outbound, z.ZodTypeDef, ModerationResponse>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ModerationResponse$ {
    /** @deprecated use `ModerationResponse$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ModerationResponse, z.ZodTypeDef, unknown>;
    /** @deprecated use `ModerationResponse$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ModerationResponse$Outbound, z.ZodTypeDef, ModerationResponse>;
    /** @deprecated use `ModerationResponse$Outbound` instead. */
    type Outbound = ModerationResponse$Outbound;
}
export declare function moderationResponseToJSON(moderationResponse: ModerationResponse): string;
export declare function moderationResponseFromJSON(jsonString: string): SafeParseResult<ModerationResponse, SDKValidationError>;
//# sourceMappingURL=moderationresponse.d.ts.map