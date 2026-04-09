import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ProcessStatus } from "./processstatus.js";
export type DocumentOut = {
    id: string;
    libraryId: string;
    hash: string | null;
    mimeType: string | null;
    extension: string | null;
    size: number | null;
    name: string;
    summary?: string | null | undefined;
    createdAt: Date;
    lastProcessedAt?: Date | null | undefined;
    numberOfPages?: number | null | undefined;
    processStatus: ProcessStatus;
    uploadedById: string | null;
    uploadedByType: string;
    tokensProcessingMainContent?: number | null | undefined;
    tokensProcessingSummary?: number | null | undefined;
    url?: string | null | undefined;
    attributes?: {
        [k: string]: any;
    } | null | undefined;
    processingStatus: string;
    tokensProcessingTotal: number;
};
/** @internal */
export declare const DocumentOut$inboundSchema: z.ZodType<DocumentOut, z.ZodTypeDef, unknown>;
export declare function documentOutFromJSON(jsonString: string): SafeParseResult<DocumentOut, SDKValidationError>;
//# sourceMappingURL=documentout.d.ts.map