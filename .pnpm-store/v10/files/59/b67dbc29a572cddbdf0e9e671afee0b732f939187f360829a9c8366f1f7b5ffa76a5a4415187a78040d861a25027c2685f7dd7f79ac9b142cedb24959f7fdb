import * as z from "zod/v3";
import { JudgeClassificationOutput, JudgeClassificationOutput$Outbound } from "./judgeclassificationoutput.js";
import { JudgeRegressionOutput, JudgeRegressionOutput$Outbound } from "./judgeregressionoutput.js";
export type Output = (JudgeClassificationOutput & {
    type: "CLASSIFICATION";
}) | (JudgeRegressionOutput & {
    type: "REGRESSION";
});
export type PostJudgeInSchema = {
    name: string;
    description: string;
    modelName: string;
    output: (JudgeClassificationOutput & {
        type: "CLASSIFICATION";
    }) | (JudgeRegressionOutput & {
        type: "REGRESSION";
    });
    instructions: string;
    tools: Array<string>;
};
/** @internal */
export type Output$Outbound = (JudgeClassificationOutput$Outbound & {
    type: "CLASSIFICATION";
}) | (JudgeRegressionOutput$Outbound & {
    type: "REGRESSION";
});
/** @internal */
export declare const Output$outboundSchema: z.ZodType<Output$Outbound, z.ZodTypeDef, Output>;
export declare function outputToJSON(output: Output): string;
/** @internal */
export type PostJudgeInSchema$Outbound = {
    name: string;
    description: string;
    model_name: string;
    output: (JudgeClassificationOutput$Outbound & {
        type: "CLASSIFICATION";
    }) | (JudgeRegressionOutput$Outbound & {
        type: "REGRESSION";
    });
    instructions: string;
    tools: Array<string>;
};
/** @internal */
export declare const PostJudgeInSchema$outboundSchema: z.ZodType<PostJudgeInSchema$Outbound, z.ZodTypeDef, PostJudgeInSchema>;
export declare function postJudgeInSchemaToJSON(postJudgeInSchema: PostJudgeInSchema): string;
//# sourceMappingURL=postjudgeinschema.d.ts.map