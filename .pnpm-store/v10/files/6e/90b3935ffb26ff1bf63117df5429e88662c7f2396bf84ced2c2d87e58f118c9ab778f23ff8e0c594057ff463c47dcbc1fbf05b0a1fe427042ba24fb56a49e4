import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { DatasetRecord } from "./datasetrecord.js";
export type PaginatedResultDatasetRecord = {
    results?: Array<DatasetRecord> | undefined;
    count: number;
    next?: string | null | undefined;
    previous?: string | null | undefined;
};
/** @internal */
export declare const PaginatedResultDatasetRecord$inboundSchema: z.ZodType<PaginatedResultDatasetRecord, z.ZodTypeDef, unknown>;
export declare function paginatedResultDatasetRecordFromJSON(jsonString: string): SafeParseResult<PaginatedResultDatasetRecord, SDKValidationError>;
//# sourceMappingURL=paginatedresultdatasetrecord.d.ts.map