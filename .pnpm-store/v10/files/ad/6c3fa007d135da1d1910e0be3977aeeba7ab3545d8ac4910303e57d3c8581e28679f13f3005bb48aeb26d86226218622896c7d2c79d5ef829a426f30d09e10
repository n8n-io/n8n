import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ModelCapabilities, ModelCapabilities$Outbound } from "./modelcapabilities.js";
export declare const FTModelCardType: {
    readonly FineTuned: "fine-tuned";
};
export type FTModelCardType = ClosedEnum<typeof FTModelCardType>;
/**
 * Extra fields for fine-tuned models.
 */
export type FTModelCard = {
    id: string;
    object?: string | undefined;
    created?: number | undefined;
    ownedBy?: string | undefined;
    capabilities: ModelCapabilities;
    name?: string | null | undefined;
    description?: string | null | undefined;
    maxContextLength?: number | undefined;
    aliases?: Array<string> | undefined;
    deprecation?: Date | null | undefined;
    deprecationReplacementModel?: string | null | undefined;
    defaultModelTemperature?: number | null | undefined;
    type?: "fine-tuned" | undefined;
    job: string;
    root: string;
    archived?: boolean | undefined;
};
/** @internal */
export declare const FTModelCardType$inboundSchema: z.ZodNativeEnum<typeof FTModelCardType>;
/** @internal */
export declare const FTModelCardType$outboundSchema: z.ZodNativeEnum<typeof FTModelCardType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FTModelCardType$ {
    /** @deprecated use `FTModelCardType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly FineTuned: "fine-tuned";
    }>;
    /** @deprecated use `FTModelCardType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly FineTuned: "fine-tuned";
    }>;
}
/** @internal */
export declare const FTModelCard$inboundSchema: z.ZodType<FTModelCard, z.ZodTypeDef, unknown>;
/** @internal */
export type FTModelCard$Outbound = {
    id: string;
    object: string;
    created?: number | undefined;
    owned_by: string;
    capabilities: ModelCapabilities$Outbound;
    name?: string | null | undefined;
    description?: string | null | undefined;
    max_context_length: number;
    aliases?: Array<string> | undefined;
    deprecation?: string | null | undefined;
    deprecation_replacement_model?: string | null | undefined;
    default_model_temperature?: number | null | undefined;
    type: "fine-tuned";
    job: string;
    root: string;
    archived: boolean;
};
/** @internal */
export declare const FTModelCard$outboundSchema: z.ZodType<FTModelCard$Outbound, z.ZodTypeDef, FTModelCard>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace FTModelCard$ {
    /** @deprecated use `FTModelCard$inboundSchema` instead. */
    const inboundSchema: z.ZodType<FTModelCard, z.ZodTypeDef, unknown>;
    /** @deprecated use `FTModelCard$outboundSchema` instead. */
    const outboundSchema: z.ZodType<FTModelCard$Outbound, z.ZodTypeDef, FTModelCard>;
    /** @deprecated use `FTModelCard$Outbound` instead. */
    type Outbound = FTModelCard$Outbound;
}
export declare function ftModelCardToJSON(ftModelCard: FTModelCard): string;
export declare function ftModelCardFromJSON(jsonString: string): SafeParseResult<FTModelCard, SDKValidationError>;
//# sourceMappingURL=ftmodelcard.d.ts.map