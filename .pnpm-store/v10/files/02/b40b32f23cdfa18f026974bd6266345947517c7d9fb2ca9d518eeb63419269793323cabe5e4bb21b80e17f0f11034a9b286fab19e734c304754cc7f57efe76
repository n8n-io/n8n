import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CheckpointOut, CheckpointOut$Outbound } from "./checkpointout.js";
import { CompletionTrainingParameters, CompletionTrainingParameters$Outbound } from "./completiontrainingparameters.js";
import { EventOut, EventOut$Outbound } from "./eventout.js";
import { GithubRepositoryOut, GithubRepositoryOut$Outbound } from "./githubrepositoryout.js";
import { JobMetadataOut, JobMetadataOut$Outbound } from "./jobmetadataout.js";
import { WandbIntegrationOut, WandbIntegrationOut$Outbound } from "./wandbintegrationout.js";
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
export declare const CompletionDetailedJobOutObject: {
    readonly Job: "job";
};
export type CompletionDetailedJobOutObject = ClosedEnum<typeof CompletionDetailedJobOutObject>;
export type CompletionDetailedJobOutIntegrations = WandbIntegrationOut;
export declare const CompletionDetailedJobOutJobType: {
    readonly Completion: "completion";
};
export type CompletionDetailedJobOutJobType = ClosedEnum<typeof CompletionDetailedJobOutJobType>;
export type CompletionDetailedJobOutRepositories = GithubRepositoryOut;
export type CompletionDetailedJobOut = {
    id: string;
    autoStart: boolean;
    /**
     * The name of the model to fine-tune.
     */
    model: string;
    status: CompletionDetailedJobOutStatus;
    createdAt: number;
    modifiedAt: number;
    trainingFiles: Array<string>;
    validationFiles?: Array<string> | null | undefined;
    object?: CompletionDetailedJobOutObject | undefined;
    fineTunedModel?: string | null | undefined;
    suffix?: string | null | undefined;
    integrations?: Array<WandbIntegrationOut> | null | undefined;
    trainedTokens?: number | null | undefined;
    metadata?: JobMetadataOut | null | undefined;
    jobType?: CompletionDetailedJobOutJobType | undefined;
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
export declare const CompletionDetailedJobOutStatus$outboundSchema: z.ZodNativeEnum<typeof CompletionDetailedJobOutStatus>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace CompletionDetailedJobOutStatus$ {
    /** @deprecated use `CompletionDetailedJobOutStatus$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
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
    }>;
    /** @deprecated use `CompletionDetailedJobOutStatus$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
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
    }>;
}
/** @internal */
export declare const CompletionDetailedJobOutObject$inboundSchema: z.ZodNativeEnum<typeof CompletionDetailedJobOutObject>;
/** @internal */
export declare const CompletionDetailedJobOutObject$outboundSchema: z.ZodNativeEnum<typeof CompletionDetailedJobOutObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace CompletionDetailedJobOutObject$ {
    /** @deprecated use `CompletionDetailedJobOutObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Job: "job";
    }>;
    /** @deprecated use `CompletionDetailedJobOutObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Job: "job";
    }>;
}
/** @internal */
export declare const CompletionDetailedJobOutIntegrations$inboundSchema: z.ZodType<CompletionDetailedJobOutIntegrations, z.ZodTypeDef, unknown>;
/** @internal */
export type CompletionDetailedJobOutIntegrations$Outbound = WandbIntegrationOut$Outbound;
/** @internal */
export declare const CompletionDetailedJobOutIntegrations$outboundSchema: z.ZodType<CompletionDetailedJobOutIntegrations$Outbound, z.ZodTypeDef, CompletionDetailedJobOutIntegrations>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace CompletionDetailedJobOutIntegrations$ {
    /** @deprecated use `CompletionDetailedJobOutIntegrations$inboundSchema` instead. */
    const inboundSchema: z.ZodType<WandbIntegrationOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `CompletionDetailedJobOutIntegrations$outboundSchema` instead. */
    const outboundSchema: z.ZodType<WandbIntegrationOut$Outbound, z.ZodTypeDef, WandbIntegrationOut>;
    /** @deprecated use `CompletionDetailedJobOutIntegrations$Outbound` instead. */
    type Outbound = CompletionDetailedJobOutIntegrations$Outbound;
}
export declare function completionDetailedJobOutIntegrationsToJSON(completionDetailedJobOutIntegrations: CompletionDetailedJobOutIntegrations): string;
export declare function completionDetailedJobOutIntegrationsFromJSON(jsonString: string): SafeParseResult<CompletionDetailedJobOutIntegrations, SDKValidationError>;
/** @internal */
export declare const CompletionDetailedJobOutJobType$inboundSchema: z.ZodNativeEnum<typeof CompletionDetailedJobOutJobType>;
/** @internal */
export declare const CompletionDetailedJobOutJobType$outboundSchema: z.ZodNativeEnum<typeof CompletionDetailedJobOutJobType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace CompletionDetailedJobOutJobType$ {
    /** @deprecated use `CompletionDetailedJobOutJobType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Completion: "completion";
    }>;
    /** @deprecated use `CompletionDetailedJobOutJobType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Completion: "completion";
    }>;
}
/** @internal */
export declare const CompletionDetailedJobOutRepositories$inboundSchema: z.ZodType<CompletionDetailedJobOutRepositories, z.ZodTypeDef, unknown>;
/** @internal */
export type CompletionDetailedJobOutRepositories$Outbound = GithubRepositoryOut$Outbound;
/** @internal */
export declare const CompletionDetailedJobOutRepositories$outboundSchema: z.ZodType<CompletionDetailedJobOutRepositories$Outbound, z.ZodTypeDef, CompletionDetailedJobOutRepositories>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace CompletionDetailedJobOutRepositories$ {
    /** @deprecated use `CompletionDetailedJobOutRepositories$inboundSchema` instead. */
    const inboundSchema: z.ZodType<GithubRepositoryOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `CompletionDetailedJobOutRepositories$outboundSchema` instead. */
    const outboundSchema: z.ZodType<GithubRepositoryOut$Outbound, z.ZodTypeDef, GithubRepositoryOut>;
    /** @deprecated use `CompletionDetailedJobOutRepositories$Outbound` instead. */
    type Outbound = CompletionDetailedJobOutRepositories$Outbound;
}
export declare function completionDetailedJobOutRepositoriesToJSON(completionDetailedJobOutRepositories: CompletionDetailedJobOutRepositories): string;
export declare function completionDetailedJobOutRepositoriesFromJSON(jsonString: string): SafeParseResult<CompletionDetailedJobOutRepositories, SDKValidationError>;
/** @internal */
export declare const CompletionDetailedJobOut$inboundSchema: z.ZodType<CompletionDetailedJobOut, z.ZodTypeDef, unknown>;
/** @internal */
export type CompletionDetailedJobOut$Outbound = {
    id: string;
    auto_start: boolean;
    model: string;
    status: string;
    created_at: number;
    modified_at: number;
    training_files: Array<string>;
    validation_files?: Array<string> | null | undefined;
    object: string;
    fine_tuned_model?: string | null | undefined;
    suffix?: string | null | undefined;
    integrations?: Array<WandbIntegrationOut$Outbound> | null | undefined;
    trained_tokens?: number | null | undefined;
    metadata?: JobMetadataOut$Outbound | null | undefined;
    job_type: string;
    hyperparameters: CompletionTrainingParameters$Outbound;
    repositories?: Array<GithubRepositoryOut$Outbound> | undefined;
    events?: Array<EventOut$Outbound> | undefined;
    checkpoints?: Array<CheckpointOut$Outbound> | undefined;
};
/** @internal */
export declare const CompletionDetailedJobOut$outboundSchema: z.ZodType<CompletionDetailedJobOut$Outbound, z.ZodTypeDef, CompletionDetailedJobOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace CompletionDetailedJobOut$ {
    /** @deprecated use `CompletionDetailedJobOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<CompletionDetailedJobOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `CompletionDetailedJobOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<CompletionDetailedJobOut$Outbound, z.ZodTypeDef, CompletionDetailedJobOut>;
    /** @deprecated use `CompletionDetailedJobOut$Outbound` instead. */
    type Outbound = CompletionDetailedJobOut$Outbound;
}
export declare function completionDetailedJobOutToJSON(completionDetailedJobOut: CompletionDetailedJobOut): string;
export declare function completionDetailedJobOutFromJSON(jsonString: string): SafeParseResult<CompletionDetailedJobOut, SDKValidationError>;
//# sourceMappingURL=completiondetailedjobout.d.ts.map