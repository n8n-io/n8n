import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { JudgeClassificationOutputOption, JudgeClassificationOutputOption$Outbound } from "./judgeclassificationoutputoption.js";
export type JudgeClassificationOutput = {
    type?: "CLASSIFICATION" | undefined;
    options: Array<JudgeClassificationOutputOption>;
};
/** @internal */
export declare const JudgeClassificationOutput$inboundSchema: z.ZodType<JudgeClassificationOutput, z.ZodTypeDef, unknown>;
/** @internal */
export type JudgeClassificationOutput$Outbound = {
    type: "CLASSIFICATION";
    options: Array<JudgeClassificationOutputOption$Outbound>;
};
/** @internal */
export declare const JudgeClassificationOutput$outboundSchema: z.ZodType<JudgeClassificationOutput$Outbound, z.ZodTypeDef, JudgeClassificationOutput>;
export declare function judgeClassificationOutputToJSON(judgeClassificationOutput: JudgeClassificationOutput): string;
export declare function judgeClassificationOutputFromJSON(jsonString: string): SafeParseResult<JudgeClassificationOutput, SDKValidationError>;
//# sourceMappingURL=judgeclassificationoutput.d.ts.map