import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type JobMetadataOut = {
    expectedDurationSeconds?: number | null | undefined;
    cost?: number | null | undefined;
    costCurrency?: string | null | undefined;
    trainTokensPerStep?: number | null | undefined;
    trainTokens?: number | null | undefined;
    dataTokens?: number | null | undefined;
    estimatedStartTime?: number | null | undefined;
};
/** @internal */
export declare const JobMetadataOut$inboundSchema: z.ZodType<JobMetadataOut, z.ZodTypeDef, unknown>;
export declare function jobMetadataOutFromJSON(jsonString: string): SafeParseResult<JobMetadataOut, SDKValidationError>;
//# sourceMappingURL=jobmetadataout.d.ts.map