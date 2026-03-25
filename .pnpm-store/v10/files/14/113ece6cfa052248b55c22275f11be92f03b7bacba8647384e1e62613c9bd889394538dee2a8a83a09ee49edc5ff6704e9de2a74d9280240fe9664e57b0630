import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CompletionTrainingParameters, CompletionTrainingParameters$Outbound } from "./completiontrainingparameters.js";
import { GithubRepositoryOut, GithubRepositoryOut$Outbound } from "./githubrepositoryout.js";
import { JobMetadataOut, JobMetadataOut$Outbound } from "./jobmetadataout.js";
import { WandbIntegrationOut, WandbIntegrationOut$Outbound } from "./wandbintegrationout.js";
/**
 * The current status of the fine-tuning job.
 */
export declare const Status: {
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
export type Status = ClosedEnum<typeof Status>;
/**
 * The object type of the fine-tuning job.
 */
export declare const CompletionJobOutObject: {
    readonly Job: "job";
};
/**
 * The object type of the fine-tuning job.
 */
export type CompletionJobOutObject = ClosedEnum<typeof CompletionJobOutObject>;
export type Integrations = WandbIntegrationOut;
/**
 * The type of job (`FT` for fine-tuning).
 */
export declare const JobType: {
    readonly Completion: "completion";
};
/**
 * The type of job (`FT` for fine-tuning).
 */
export type JobType = ClosedEnum<typeof JobType>;
export type Repositories = GithubRepositoryOut;
export type CompletionJobOut = {
    /**
     * The ID of the job.
     */
    id: string;
    autoStart: boolean;
    /**
     * The name of the model to fine-tune.
     */
    model: string;
    /**
     * The current status of the fine-tuning job.
     */
    status: Status;
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
    object?: CompletionJobOutObject | undefined;
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
    jobType?: JobType | undefined;
    hyperparameters: CompletionTrainingParameters;
    repositories?: Array<GithubRepositoryOut> | undefined;
};
/** @internal */
export declare const Status$inboundSchema: z.ZodNativeEnum<typeof Status>;
/** @internal */
export declare const Status$outboundSchema: z.ZodNativeEnum<typeof Status>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Status$ {
    /** @deprecated use `Status$inboundSchema` instead. */
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
    /** @deprecated use `Status$outboundSchema` instead. */
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
export declare const CompletionJobOutObject$inboundSchema: z.ZodNativeEnum<typeof CompletionJobOutObject>;
/** @internal */
export declare const CompletionJobOutObject$outboundSchema: z.ZodNativeEnum<typeof CompletionJobOutObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace CompletionJobOutObject$ {
    /** @deprecated use `CompletionJobOutObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Job: "job";
    }>;
    /** @deprecated use `CompletionJobOutObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Job: "job";
    }>;
}
/** @internal */
export declare const Integrations$inboundSchema: z.ZodType<Integrations, z.ZodTypeDef, unknown>;
/** @internal */
export type Integrations$Outbound = WandbIntegrationOut$Outbound;
/** @internal */
export declare const Integrations$outboundSchema: z.ZodType<Integrations$Outbound, z.ZodTypeDef, Integrations>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Integrations$ {
    /** @deprecated use `Integrations$inboundSchema` instead. */
    const inboundSchema: z.ZodType<WandbIntegrationOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `Integrations$outboundSchema` instead. */
    const outboundSchema: z.ZodType<WandbIntegrationOut$Outbound, z.ZodTypeDef, WandbIntegrationOut>;
    /** @deprecated use `Integrations$Outbound` instead. */
    type Outbound = Integrations$Outbound;
}
export declare function integrationsToJSON(integrations: Integrations): string;
export declare function integrationsFromJSON(jsonString: string): SafeParseResult<Integrations, SDKValidationError>;
/** @internal */
export declare const JobType$inboundSchema: z.ZodNativeEnum<typeof JobType>;
/** @internal */
export declare const JobType$outboundSchema: z.ZodNativeEnum<typeof JobType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace JobType$ {
    /** @deprecated use `JobType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Completion: "completion";
    }>;
    /** @deprecated use `JobType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Completion: "completion";
    }>;
}
/** @internal */
export declare const Repositories$inboundSchema: z.ZodType<Repositories, z.ZodTypeDef, unknown>;
/** @internal */
export type Repositories$Outbound = GithubRepositoryOut$Outbound;
/** @internal */
export declare const Repositories$outboundSchema: z.ZodType<Repositories$Outbound, z.ZodTypeDef, Repositories>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Repositories$ {
    /** @deprecated use `Repositories$inboundSchema` instead. */
    const inboundSchema: z.ZodType<GithubRepositoryOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `Repositories$outboundSchema` instead. */
    const outboundSchema: z.ZodType<GithubRepositoryOut$Outbound, z.ZodTypeDef, GithubRepositoryOut>;
    /** @deprecated use `Repositories$Outbound` instead. */
    type Outbound = Repositories$Outbound;
}
export declare function repositoriesToJSON(repositories: Repositories): string;
export declare function repositoriesFromJSON(jsonString: string): SafeParseResult<Repositories, SDKValidationError>;
/** @internal */
export declare const CompletionJobOut$inboundSchema: z.ZodType<CompletionJobOut, z.ZodTypeDef, unknown>;
/** @internal */
export type CompletionJobOut$Outbound = {
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
};
/** @internal */
export declare const CompletionJobOut$outboundSchema: z.ZodType<CompletionJobOut$Outbound, z.ZodTypeDef, CompletionJobOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace CompletionJobOut$ {
    /** @deprecated use `CompletionJobOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<CompletionJobOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `CompletionJobOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<CompletionJobOut$Outbound, z.ZodTypeDef, CompletionJobOut>;
    /** @deprecated use `CompletionJobOut$Outbound` instead. */
    type Outbound = CompletionJobOut$Outbound;
}
export declare function completionJobOutToJSON(completionJobOut: CompletionJobOut): string;
export declare function completionJobOutFromJSON(jsonString: string): SafeParseResult<CompletionJobOut, SDKValidationError>;
//# sourceMappingURL=completionjobout.d.ts.map