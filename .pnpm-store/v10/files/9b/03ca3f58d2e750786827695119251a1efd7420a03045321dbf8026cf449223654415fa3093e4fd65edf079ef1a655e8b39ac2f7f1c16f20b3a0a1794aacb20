import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type SharingOut = {
    libraryId: string;
    userId?: string | null | undefined;
    orgId: string;
    role: string;
    shareWithType: string;
    shareWithUuid: string | null;
};
/** @internal */
export declare const SharingOut$inboundSchema: z.ZodType<SharingOut, z.ZodTypeDef, unknown>;
export declare function sharingOutFromJSON(jsonString: string): SafeParseResult<SharingOut, SDKValidationError>;
//# sourceMappingURL=sharingout.d.ts.map