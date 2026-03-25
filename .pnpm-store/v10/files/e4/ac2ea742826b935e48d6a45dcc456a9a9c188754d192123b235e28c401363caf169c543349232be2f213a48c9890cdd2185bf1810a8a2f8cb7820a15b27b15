import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const WandbIntegrationOutType: {
    readonly Wandb: "wandb";
};
export type WandbIntegrationOutType = ClosedEnum<typeof WandbIntegrationOutType>;
export type WandbIntegrationOut = {
    type?: WandbIntegrationOutType | undefined;
    /**
     * The name of the project that the new run will be created under.
     */
    project: string;
    /**
     * A display name to set for the run. If not set, will use the job ID as the name.
     */
    name?: string | null | undefined;
    runName?: string | null | undefined;
    url?: string | null | undefined;
};
/** @internal */
export declare const WandbIntegrationOutType$inboundSchema: z.ZodNativeEnum<typeof WandbIntegrationOutType>;
/** @internal */
export declare const WandbIntegrationOutType$outboundSchema: z.ZodNativeEnum<typeof WandbIntegrationOutType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace WandbIntegrationOutType$ {
    /** @deprecated use `WandbIntegrationOutType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Wandb: "wandb";
    }>;
    /** @deprecated use `WandbIntegrationOutType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Wandb: "wandb";
    }>;
}
/** @internal */
export declare const WandbIntegrationOut$inboundSchema: z.ZodType<WandbIntegrationOut, z.ZodTypeDef, unknown>;
/** @internal */
export type WandbIntegrationOut$Outbound = {
    type: string;
    project: string;
    name?: string | null | undefined;
    run_name?: string | null | undefined;
    url?: string | null | undefined;
};
/** @internal */
export declare const WandbIntegrationOut$outboundSchema: z.ZodType<WandbIntegrationOut$Outbound, z.ZodTypeDef, WandbIntegrationOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace WandbIntegrationOut$ {
    /** @deprecated use `WandbIntegrationOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<WandbIntegrationOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `WandbIntegrationOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<WandbIntegrationOut$Outbound, z.ZodTypeDef, WandbIntegrationOut>;
    /** @deprecated use `WandbIntegrationOut$Outbound` instead. */
    type Outbound = WandbIntegrationOut$Outbound;
}
export declare function wandbIntegrationOutToJSON(wandbIntegrationOut: WandbIntegrationOut): string;
export declare function wandbIntegrationOutFromJSON(jsonString: string): SafeParseResult<WandbIntegrationOut, SDKValidationError>;
//# sourceMappingURL=wandbintegrationout.d.ts.map