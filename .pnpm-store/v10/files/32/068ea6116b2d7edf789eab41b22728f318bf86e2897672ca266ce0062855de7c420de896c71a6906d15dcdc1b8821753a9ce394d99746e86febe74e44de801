import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const WandbIntegrationType: {
    readonly Wandb: "wandb";
};
export type WandbIntegrationType = ClosedEnum<typeof WandbIntegrationType>;
export type WandbIntegration = {
    type?: WandbIntegrationType | undefined;
    /**
     * The name of the project that the new run will be created under.
     */
    project: string;
    /**
     * A display name to set for the run. If not set, will use the job ID as the name.
     */
    name?: string | null | undefined;
    /**
     * The WandB API key to use for authentication.
     */
    apiKey: string;
    runName?: string | null | undefined;
};
/** @internal */
export declare const WandbIntegrationType$inboundSchema: z.ZodNativeEnum<typeof WandbIntegrationType>;
/** @internal */
export declare const WandbIntegrationType$outboundSchema: z.ZodNativeEnum<typeof WandbIntegrationType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace WandbIntegrationType$ {
    /** @deprecated use `WandbIntegrationType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Wandb: "wandb";
    }>;
    /** @deprecated use `WandbIntegrationType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Wandb: "wandb";
    }>;
}
/** @internal */
export declare const WandbIntegration$inboundSchema: z.ZodType<WandbIntegration, z.ZodTypeDef, unknown>;
/** @internal */
export type WandbIntegration$Outbound = {
    type: string;
    project: string;
    name?: string | null | undefined;
    api_key: string;
    run_name?: string | null | undefined;
};
/** @internal */
export declare const WandbIntegration$outboundSchema: z.ZodType<WandbIntegration$Outbound, z.ZodTypeDef, WandbIntegration>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace WandbIntegration$ {
    /** @deprecated use `WandbIntegration$inboundSchema` instead. */
    const inboundSchema: z.ZodType<WandbIntegration, z.ZodTypeDef, unknown>;
    /** @deprecated use `WandbIntegration$outboundSchema` instead. */
    const outboundSchema: z.ZodType<WandbIntegration$Outbound, z.ZodTypeDef, WandbIntegration>;
    /** @deprecated use `WandbIntegration$Outbound` instead. */
    type Outbound = WandbIntegration$Outbound;
}
export declare function wandbIntegrationToJSON(wandbIntegration: WandbIntegration): string;
export declare function wandbIntegrationFromJSON(jsonString: string): SafeParseResult<WandbIntegration, SDKValidationError>;
//# sourceMappingURL=wandbintegration.d.ts.map