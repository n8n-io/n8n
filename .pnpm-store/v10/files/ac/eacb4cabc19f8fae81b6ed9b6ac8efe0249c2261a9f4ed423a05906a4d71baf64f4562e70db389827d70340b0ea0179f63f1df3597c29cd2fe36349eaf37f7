import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { DatasetPreview } from "./datasetpreview.js";
export type PaginatedResultDatasetPreview = {
    results?: Array<DatasetPreview> | undefined;
    count: number;
    next?: string | null | undefined;
    previous?: string | null | undefined;
};
/** @internal */
export declare const PaginatedResultDatasetPreview$inboundSchema: z.ZodType<PaginatedResultDatasetPreview, z.ZodTypeDef, unknown>;
export declare function paginatedResultDatasetPreviewFromJSON(jsonString: string): SafeParseResult<PaginatedResultDatasetPreview, SDKValidationError>;
//# sourceMappingURL=paginatedresultdatasetpreview.d.ts.map