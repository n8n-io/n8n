import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ModelCapabilities, ModelCapabilities$Outbound } from "./modelcapabilities.js";
export declare const BaseModelCardType: {
    readonly Base: "base";
};
export type BaseModelCardType = ClosedEnum<typeof BaseModelCardType>;
export type BaseModelCard = {
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
    type?: "base" | undefined;
};
/** @internal */
export declare const BaseModelCardType$inboundSchema: z.ZodNativeEnum<typeof BaseModelCardType>;
/** @internal */
export declare const BaseModelCardType$outboundSchema: z.ZodNativeEnum<typeof BaseModelCardType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace BaseModelCardType$ {
    /** @deprecated use `BaseModelCardType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Base: "base";
    }>;
    /** @deprecated use `BaseModelCardType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Base: "base";
    }>;
}
/** @internal */
export declare const BaseModelCard$inboundSchema: z.ZodType<BaseModelCard, z.ZodTypeDef, unknown>;
/** @internal */
export type BaseModelCard$Outbound = {
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
    type: "base";
};
/** @internal */
export declare const BaseModelCard$outboundSchema: z.ZodType<BaseModelCard$Outbound, z.ZodTypeDef, BaseModelCard>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace BaseModelCard$ {
    /** @deprecated use `BaseModelCard$inboundSchema` instead. */
    const inboundSchema: z.ZodType<BaseModelCard, z.ZodTypeDef, unknown>;
    /** @deprecated use `BaseModelCard$outboundSchema` instead. */
    const outboundSchema: z.ZodType<BaseModelCard$Outbound, z.ZodTypeDef, BaseModelCard>;
    /** @deprecated use `BaseModelCard$Outbound` instead. */
    type Outbound = BaseModelCard$Outbound;
}
export declare function baseModelCardToJSON(baseModelCard: BaseModelCard): string;
export declare function baseModelCardFromJSON(jsonString: string): SafeParseResult<BaseModelCard, SDKValidationError>;
//# sourceMappingURL=basemodelcard.d.ts.map