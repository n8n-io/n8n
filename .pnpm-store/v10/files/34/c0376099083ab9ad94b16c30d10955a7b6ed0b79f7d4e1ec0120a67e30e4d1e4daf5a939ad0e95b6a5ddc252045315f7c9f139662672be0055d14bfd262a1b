import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { EmbeddingResponseData } from "./embeddingresponsedata.js";
import { UsageInfo } from "./usageinfo.js";
export type EmbeddingResponse = {
    id: string;
    object: string;
    model: string;
    usage: UsageInfo;
    data: Array<EmbeddingResponseData>;
};
/** @internal */
export declare const EmbeddingResponse$inboundSchema: z.ZodType<EmbeddingResponse, z.ZodTypeDef, unknown>;
export declare function embeddingResponseFromJSON(jsonString: string): SafeParseResult<EmbeddingResponse, SDKValidationError>;
//# sourceMappingURL=embeddingresponse.d.ts.map