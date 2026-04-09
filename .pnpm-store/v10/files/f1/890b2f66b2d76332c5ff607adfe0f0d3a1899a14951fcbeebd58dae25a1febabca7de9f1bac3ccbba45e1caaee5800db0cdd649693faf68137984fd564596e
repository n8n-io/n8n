import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type Answer = string | number;
export type JudgeOutput = {
    analysis: string;
    answer: string | number;
};
/** @internal */
export declare const Answer$inboundSchema: z.ZodType<Answer, z.ZodTypeDef, unknown>;
export declare function answerFromJSON(jsonString: string): SafeParseResult<Answer, SDKValidationError>;
/** @internal */
export declare const JudgeOutput$inboundSchema: z.ZodType<JudgeOutput, z.ZodTypeDef, unknown>;
export declare function judgeOutputFromJSON(jsonString: string): SafeParseResult<JudgeOutput, SDKValidationError>;
//# sourceMappingURL=judgeoutput.d.ts.map