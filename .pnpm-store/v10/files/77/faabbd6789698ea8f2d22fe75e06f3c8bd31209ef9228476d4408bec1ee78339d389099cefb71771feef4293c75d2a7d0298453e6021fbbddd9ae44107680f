import * as z from "zod/v3";
import { JudgeClassificationOutput, JudgeClassificationOutput$Outbound } from "./judgeclassificationoutput.js";
import { JudgeRegressionOutput, JudgeRegressionOutput$Outbound } from "./judgeregressionoutput.js";
export type PutJudgeInSchemaOutput = (JudgeClassificationOutput & {
    type: "CLASSIFICATION";
}) | (JudgeRegressionOutput & {
    type: "REGRESSION";
});
export type PutJudgeInSchema = {
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
export type PutJudgeInSchemaOutput$Outbound = (JudgeClassificationOutput$Outbound & {
    type: "CLASSIFICATION";
}) | (JudgeRegressionOutput$Outbound & {
    type: "REGRESSION";
});
/** @internal */
export declare const PutJudgeInSchemaOutput$outboundSchema: z.ZodType<PutJudgeInSchemaOutput$Outbound, z.ZodTypeDef, PutJudgeInSchemaOutput>;
export declare function putJudgeInSchemaOutputToJSON(putJudgeInSchemaOutput: PutJudgeInSchemaOutput): string;
/** @internal */
export type PutJudgeInSchema$Outbound = {
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
export declare const PutJudgeInSchema$outboundSchema: z.ZodType<PutJudgeInSchema$Outbound, z.ZodTypeDef, PutJudgeInSchema>;
export declare function putJudgeInSchemaToJSON(putJudgeInSchema: PutJudgeInSchema): string;
//# sourceMappingURL=putjudgeinschema.d.ts.map