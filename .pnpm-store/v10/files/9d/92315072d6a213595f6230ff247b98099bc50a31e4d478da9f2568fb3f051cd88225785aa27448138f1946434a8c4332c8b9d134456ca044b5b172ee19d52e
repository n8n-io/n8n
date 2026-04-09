import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type JudgeRegressionOutput = {
    type?: "REGRESSION" | undefined;
    min?: number | undefined;
    minDescription: string;
    max?: number | undefined;
    maxDescription: string;
};
/** @internal */
export declare const JudgeRegressionOutput$inboundSchema: z.ZodType<JudgeRegressionOutput, z.ZodTypeDef, unknown>;
/** @internal */
export type JudgeRegressionOutput$Outbound = {
    type: "REGRESSION";
    min: number;
    min_description: string;
    max: number;
    max_description: string;
};
/** @internal */
export declare const JudgeRegressionOutput$outboundSchema: z.ZodType<JudgeRegressionOutput$Outbound, z.ZodTypeDef, JudgeRegressionOutput>;
export declare function judgeRegressionOutputToJSON(judgeRegressionOutput: JudgeRegressionOutput): string;
export declare function judgeRegressionOutputFromJSON(jsonString: string): SafeParseResult<JudgeRegressionOutput, SDKValidationError>;
//# sourceMappingURL=judgeregressionoutput.d.ts.map