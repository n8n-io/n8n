import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { JudgePreview } from "./judgepreview.js";
export type PaginatedResultJudgePreview = {
    results?: Array<JudgePreview> | undefined;
    count: number;
    next?: string | null | undefined;
    previous?: string | null | undefined;
};
/** @internal */
export declare const PaginatedResultJudgePreview$inboundSchema: z.ZodType<PaginatedResultJudgePreview, z.ZodTypeDef, unknown>;
export declare function paginatedResultJudgePreviewFromJSON(jsonString: string): SafeParseResult<PaginatedResultJudgePreview, SDKValidationError>;
//# sourceMappingURL=paginatedresultjudgepreview.d.ts.map