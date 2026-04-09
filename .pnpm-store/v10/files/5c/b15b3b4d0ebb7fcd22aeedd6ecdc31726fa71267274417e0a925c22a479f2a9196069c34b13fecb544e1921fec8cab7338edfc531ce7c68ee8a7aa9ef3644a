import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FilterPayload } from "./filterpayload.js";
import { JudgePreview } from "./judgepreview.js";
export type CampaignPreview = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    name: string;
    ownerId: string;
    workspaceId: string;
    description: string;
    maxNbEvents: number;
    searchParams: FilterPayload;
    judge: JudgePreview;
};
/** @internal */
export declare const CampaignPreview$inboundSchema: z.ZodType<CampaignPreview, z.ZodTypeDef, unknown>;
export declare function campaignPreviewFromJSON(jsonString: string): SafeParseResult<CampaignPreview, SDKValidationError>;
//# sourceMappingURL=campaignpreview.d.ts.map