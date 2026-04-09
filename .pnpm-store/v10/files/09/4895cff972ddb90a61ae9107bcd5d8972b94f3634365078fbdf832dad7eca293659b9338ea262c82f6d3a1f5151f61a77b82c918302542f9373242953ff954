import * as z from "zod/v3";
export type WandbIntegration = {
    type?: "wandb" | undefined;
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
export type WandbIntegration$Outbound = {
    type: "wandb";
    project: string;
    name?: string | null | undefined;
    api_key: string;
    run_name?: string | null | undefined;
};
/** @internal */
export declare const WandbIntegration$outboundSchema: z.ZodType<WandbIntegration$Outbound, z.ZodTypeDef, WandbIntegration>;
export declare function wandbIntegrationToJSON(wandbIntegration: WandbIntegration): string;
//# sourceMappingURL=wandbintegration.d.ts.map