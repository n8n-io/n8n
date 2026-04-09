import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CheckpointOut } from "./checkpointout.js";
import { CompletionTrainingParameters } from "./completiontrainingparameters.js";
import { EventOut } from "./eventout.js";
import { GithubRepositoryOut } from "./githubrepositoryout.js";
import { JobMetadataOut } from "./jobmetadataout.js";
import { WandbIntegrationOut } from "./wandbintegrationout.js";
export declare const CompletionDetailedJobOutStatus: {
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
export type CompletionDetailedJobOutStatus = ClosedEnum<typeof CompletionDetailedJobOutStatus>;
export type CompletionDetailedJobOutIntegrations = WandbIntegrationOut;
export type CompletionDetailedJobOutRepositories = GithubRepositoryOut;
export type CompletionDetailedJobOut = {
    id: string;
    autoStart: boolean;
    model: string;
    status: CompletionDetailedJobOutStatus;
    createdAt: number;
    modifiedAt: number;
    trainingFiles: Array<string>;
    validationFiles?: Array<string> | null | undefined;
    object?: "job" | undefined;
    fineTunedModel?: string | null | undefined;
    suffix?: string | null | undefined;
    integrations?: Array<WandbIntegrationOut> | null | undefined;
    trainedTokens?: number | null | undefined;
    metadata?: JobMetadataOut | null | undefined;
    jobType?: "completion" | undefined;
    hyperparameters: CompletionTrainingParameters;
    repositories?: Array<GithubRepositoryOut> | undefined;
    /**
     * Event items are created every time the status of a fine-tuning job changes. The timestamped list of all events is accessible here.
     */
    events?: Array<EventOut> | undefined;
    checkpoints?: Array<CheckpointOut> | undefined;
};
/** @internal */
export declare const CompletionDetailedJobOutStatus$inboundSchema: z.ZodNativeEnum<typeof CompletionDetailedJobOutStatus>;
/** @internal */
export declare const CompletionDetailedJobOutIntegrations$inboundSchema: z.ZodType<CompletionDetailedJobOutIntegrations, z.ZodTypeDef, unknown>;
export declare function completionDetailedJobOutIntegrationsFromJSON(jsonString: string): SafeParseResult<CompletionDetailedJobOutIntegrations, SDKValidationError>;
/** @internal */
export declare const CompletionDetailedJobOutRepositories$inboundSchema: z.ZodType<CompletionDetailedJobOutRepositories, z.ZodTypeDef, unknown>;
export declare function completionDetailedJobOutRepositoriesFromJSON(jsonString: string): SafeParseResult<CompletionDetailedJobOutRepositories, SDKValidationError>;
/** @internal */
export declare const CompletionDetailedJobOut$inboundSchema: z.ZodType<CompletionDetailedJobOut, z.ZodTypeDef, unknown>;
export declare function completionDetailedJobOutFromJSON(jsonString: string): SafeParseResult<CompletionDetailedJobOut, SDKValidationError>;
//# sourceMappingURL=completiondetailedjobout.d.ts.map