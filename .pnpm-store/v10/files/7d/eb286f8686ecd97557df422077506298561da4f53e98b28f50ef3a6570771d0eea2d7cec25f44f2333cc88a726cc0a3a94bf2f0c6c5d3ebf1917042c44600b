import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { JudgeClassificationOutput } from "./judgeclassificationoutput.js";
import { JudgeRegressionOutput } from "./judgeregressionoutput.js";
export type JudgePreviewOutput = (JudgeClassificationOutput & {
    type: "CLASSIFICATION";
}) | (JudgeRegressionOutput & {
    type: "REGRESSION";
});
export type JudgePreview = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    ownerId: string;
    workspaceId: string;
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
    upRevision?: string | null | undefined;
    downRevision?: string | null | undefined;
    baseRevision?: string | null | undefined;
};
/** @internal */
export declare const JudgePreviewOutput$inboundSchema: z.ZodType<JudgePreviewOutput, z.ZodTypeDef, unknown>;
export declare function judgePreviewOutputFromJSON(jsonString: string): SafeParseResult<JudgePreviewOutput, SDKValidationError>;
/** @internal */
export declare const JudgePreview$inboundSchema: z.ZodType<JudgePreview, z.ZodTypeDef, unknown>;
export declare function judgePreviewFromJSON(jsonString: string): SafeParseResult<JudgePreview, SDKValidationError>;
//# sourceMappingURL=judgepreview.d.ts.map