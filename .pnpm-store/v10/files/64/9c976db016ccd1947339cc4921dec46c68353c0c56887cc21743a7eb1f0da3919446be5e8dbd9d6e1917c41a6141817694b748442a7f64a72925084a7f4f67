import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ObservabilityErrorCode } from "./observabilityerrorcode.js";
export type ObservabilityErrorDetail = {
    message: string;
    errorCode: ObservabilityErrorCode | null;
};
/** @internal */
export declare const ObservabilityErrorDetail$inboundSchema: z.ZodType<ObservabilityErrorDetail, z.ZodTypeDef, unknown>;
export declare function observabilityErrorDetailFromJSON(jsonString: string): SafeParseResult<ObservabilityErrorDetail, SDKValidationError>;
//# sourceMappingURL=observabilityerrordetail.d.ts.map