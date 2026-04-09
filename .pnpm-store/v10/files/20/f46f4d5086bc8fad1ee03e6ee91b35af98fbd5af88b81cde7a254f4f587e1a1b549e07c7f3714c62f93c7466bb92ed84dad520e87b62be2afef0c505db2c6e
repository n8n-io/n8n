import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ClassifierTrainingParameters } from "./classifiertrainingparameters.js";
import { JobMetadataOut } from "./jobmetadataout.js";
import { WandbIntegrationOut } from "./wandbintegrationout.js";
/**
 * The current status of the fine-tuning job.
 */
export declare const ClassifierJobOutStatus: {
    readonly Queued: "QUEUED";
    readonly Started: "STARTED";
    readonly Validating: "VALIDATING";
    readonly Validated: "VALIDATED";
    readonly Running: "RUNNING";
    readonly FailedValidation: "FAILED_VALIDATION";
    readonly Failed: "FAILED";
    readonly Success: "SUCCESS";
    readonly Cancelled: "CANCELLED";
    readonly CancellationRequested: "CANCELLATION_REQUESTED";
};
/**
 * The current status of the fine-tuning job.
 */
export type ClassifierJobOutStatus = ClosedEnum<typeof ClassifierJobOutStatus>;
export type ClassifierJobOutIntegrations = WandbIntegrationOut;
export type ClassifierJobOut = {
    /**
     * The ID of the job.
     */
    id: string;
    autoStart: boolean;
    model: string;
    /**
     * The current status of the fine-tuning job.
     */
    status: ClassifierJobOutStatus;
    /**
     * The UNIX timestamp (in seconds) for when the fine-tuning job was created.
     */
    createdAt: number;
    /**
     * The UNIX timestamp (in seconds) for when the fine-tuning job was last modified.
     */
    modifiedAt: number;
    /**
     * A list containing the IDs of uploaded files that contain training data.
     */
    trainingFiles: Array<string>;
    /**
     * A list containing the IDs of uploaded files that contain validation data.
     */
    validationFiles?: Array<string> | null | undefined;
    /**
     * The object type of the fine-tuning job.
     */
    object?: "job" | undefined;
    /**
     * The name of the fine-tuned model that is being created. The value will be `null` if the fine-tuning job is still running.
     */
    fineTunedModel?: string | null | undefined;
    /**
     * Optional text/code that adds more context for the model. When given a `prompt` and a `suffix` the model will fill what is between them. When `suffix` is not provided, the model will simply execute completion starting with `prompt`.
     */
    suffix?: string | null | undefined;
    /**
     * A list of integrations enabled for your fine-tuning job.
     */
    integrations?: Array<WandbIntegrationOut> | null | undefined;
    /**
     * Total number of tokens trained.
     */
    trainedTokens?: number | null | undefined;
    metadata?: JobMetadataOut | null | undefined;
    /**
     * The type of job (`FT` for fine-tuning).
     */
    jobType?: "classifier" | undefined;
    hyperparameters: ClassifierTrainingParameters;
};
/** @internal */
export declare const ClassifierJobOutStatus$inboundSchema: z.ZodNativeEnum<typeof ClassifierJobOutStatus>;
/** @internal */
export declare const ClassifierJobOutIntegrations$inboundSchema: z.ZodType<ClassifierJobOutIntegrations, z.ZodTypeDef, unknown>;
export declare function classifierJobOutIntegrationsFromJSON(jsonString: string): SafeParseResult<ClassifierJobOutIntegrations, SDKValidationError>;
/** @internal */
export declare const ClassifierJobOut$inboundSchema: z.ZodType<ClassifierJobOut, z.ZodTypeDef, unknown>;
export declare function classifierJobOutFromJSON(jsonString: string): SafeParseResult<ClassifierJobOut, SDKValidationError>;
//# sourceMappingURL=classifierjobout.d.ts.map