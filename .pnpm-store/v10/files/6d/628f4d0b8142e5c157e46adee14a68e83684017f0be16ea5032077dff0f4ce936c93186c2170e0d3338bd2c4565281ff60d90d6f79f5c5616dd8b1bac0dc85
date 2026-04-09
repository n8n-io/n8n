import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CampaignPreview } from "./campaignpreview.js";
export type PaginatedResultCampaignPreview = {
    results?: Array<CampaignPreview> | undefined;
    count: number;
    next?: string | null | undefined;
    previous?: string | null | undefined;
};
/** @internal */
export declare const PaginatedResultCampaignPreview$inboundSchema: z.ZodType<PaginatedResultCampaignPreview, z.ZodTypeDef, unknown>;
export declare function paginatedResultCampaignPreviewFromJSON(jsonString: string): SafeParseResult<PaginatedResultCampaignPreview, SDKValidationError>;
//# sourceMappingURL=paginatedresultcampaignpreview.d.ts.map