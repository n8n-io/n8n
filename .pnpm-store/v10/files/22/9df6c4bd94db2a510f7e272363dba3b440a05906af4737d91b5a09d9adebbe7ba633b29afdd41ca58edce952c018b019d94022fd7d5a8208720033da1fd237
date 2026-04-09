import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { BaseModelCard } from "./basemodelcard.js";
import { FTModelCard } from "./ftmodelcard.js";
export type Data = (BaseModelCard & {
    type: "base";
}) | (FTModelCard & {
    type: "fine-tuned";
});
export type ModelList = {
    object: string | undefined;
    data?: Array<(BaseModelCard & {
        type: "base";
    }) | (FTModelCard & {
        type: "fine-tuned";
    })> | undefined;
};
/** @internal */
export declare const Data$inboundSchema: z.ZodType<Data, z.ZodTypeDef, unknown>;
export declare function dataFromJSON(jsonString: string): SafeParseResult<Data, SDKValidationError>;
/** @internal */
export declare const ModelList$inboundSchema: z.ZodType<ModelList, z.ZodTypeDef, unknown>;
export declare function modelListFromJSON(jsonString: string): SafeParseResult<ModelList, SDKValidationError>;
//# sourceMappingURL=modellist.d.ts.map