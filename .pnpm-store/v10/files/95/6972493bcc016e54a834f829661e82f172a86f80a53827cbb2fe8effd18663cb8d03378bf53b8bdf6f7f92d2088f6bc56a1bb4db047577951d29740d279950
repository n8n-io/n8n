import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { BaseModelCard, BaseModelCard$Outbound } from "./basemodelcard.js";
import { FTModelCard, FTModelCard$Outbound } from "./ftmodelcard.js";
export type Data = (FTModelCard & {
    type: "fine-tuned";
}) | (BaseModelCard & {
    type: "base";
});
export type ModelList = {
    object?: string | undefined;
    data?: Array<(FTModelCard & {
        type: "fine-tuned";
    }) | (BaseModelCard & {
        type: "base";
    })> | undefined;
};
/** @internal */
export declare const Data$inboundSchema: z.ZodType<Data, z.ZodTypeDef, unknown>;
/** @internal */
export type Data$Outbound = (FTModelCard$Outbound & {
    type: "fine-tuned";
}) | (BaseModelCard$Outbound & {
    type: "base";
});
/** @internal */
export declare const Data$outboundSchema: z.ZodType<Data$Outbound, z.ZodTypeDef, Data>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Data$ {
    /** @deprecated use `Data$inboundSchema` instead. */
    const inboundSchema: z.ZodType<Data, z.ZodTypeDef, unknown>;
    /** @deprecated use `Data$outboundSchema` instead. */
    const outboundSchema: z.ZodType<Data$Outbound, z.ZodTypeDef, Data>;
    /** @deprecated use `Data$Outbound` instead. */
    type Outbound = Data$Outbound;
}
export declare function dataToJSON(data: Data): string;
export declare function dataFromJSON(jsonString: string): SafeParseResult<Data, SDKValidationError>;
/** @internal */
export declare const ModelList$inboundSchema: z.ZodType<ModelList, z.ZodTypeDef, unknown>;
/** @internal */
export type ModelList$Outbound = {
    object: string;
    data?: Array<(FTModelCard$Outbound & {
        type: "fine-tuned";
    }) | (BaseModelCard$Outbound & {
        type: "base";
    })> | undefined;
};
/** @internal */
export declare const ModelList$outboundSchema: z.ZodType<ModelList$Outbound, z.ZodTypeDef, ModelList>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ModelList$ {
    /** @deprecated use `ModelList$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ModelList, z.ZodTypeDef, unknown>;
    /** @deprecated use `ModelList$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ModelList$Outbound, z.ZodTypeDef, ModelList>;
    /** @deprecated use `ModelList$Outbound` instead. */
    type Outbound = ModelList$Outbound;
}
export declare function modelListToJSON(modelList: ModelList): string;
export declare function modelListFromJSON(jsonString: string): SafeParseResult<ModelList, SDKValidationError>;
//# sourceMappingURL=modellist.d.ts.map