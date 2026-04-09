import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type WandbIntegrationOut = {
    type?: "wandb" | undefined;
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
export declare const WandbIntegrationOut$inboundSchema: z.ZodType<WandbIntegrationOut, z.ZodTypeDef, unknown>;
export declare function wandbIntegrationOutFromJSON(jsonString: string): SafeParseResult<WandbIntegrationOut, SDKValidationError>;
//# sourceMappingURL=wandbintegrationout.d.ts.map