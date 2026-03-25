import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ClassifierTargetIn, ClassifierTargetIn$Outbound } from "./classifiertargetin.js";
import { ClassifierTrainingParametersIn, ClassifierTrainingParametersIn$Outbound } from "./classifiertrainingparametersin.js";
import { CompletionTrainingParametersIn, CompletionTrainingParametersIn$Outbound } from "./completiontrainingparametersin.js";
import { FineTuneableModelType } from "./finetuneablemodeltype.js";
import { GithubRepositoryIn, GithubRepositoryIn$Outbound } from "./githubrepositoryin.js";
import { TrainingFile, TrainingFile$Outbound } from "./trainingfile.js";
import { WandbIntegration, WandbIntegration$Outbound } from "./wandbintegration.js";
export type JobInIntegrations = WandbIntegration;
export type Hyperparameters = CompletionTrainingParametersIn | ClassifierTrainingParametersIn;
export type JobInRepositories = GithubRepositoryIn;
export type JobIn = {
    /**
     * The name of the model to fine-tune.
     */
    model: string;
    trainingFiles?: Array<TrainingFile> | undefined;
    /**
     * A list containing the IDs of uploaded files that contain validation data. If you provide these files, the data is used to generate validation metrics periodically during fine-tuning. These metrics can be viewed in `checkpoints` when getting the status of a running fine-tuning job. The same data should not be present in both train and validation files.
     */
    validationFiles?: Array<string> | null | undefined;
    /**
     * A string that will be added to your fine-tuning model name. For example, a suffix of "my-great-model" would produce a model name like `ft:open-mistral-7b:my-great-model:xxx...`
     */
    suffix?: string | null | undefined;
    /**
     * A list of integrations to enable for your fine-tuning job.
     */
    integrations?: Array<WandbIntegration> | null | undefined;
    /**
     * This field will be required in a future release.
     */
    autoStart?: boolean | undefined;
    invalidSampleSkipPercentage?: number | undefined;
    jobType?: FineTuneableModelType | null | undefined;
    hyperparameters: CompletionTrainingParametersIn | ClassifierTrainingParametersIn;
    repositories?: Array<GithubRepositoryIn> | null | undefined;
    classifierTargets?: Array<ClassifierTargetIn> | null | undefined;
};
/** @internal */
export declare const JobInIntegrations$inboundSchema: z.ZodType<JobInIntegrations, z.ZodTypeDef, unknown>;
/** @internal */
export type JobInIntegrations$Outbound = WandbIntegration$Outbound;
/** @internal */
export declare const JobInIntegrations$outboundSchema: z.ZodType<JobInIntegrations$Outbound, z.ZodTypeDef, JobInIntegrations>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace JobInIntegrations$ {
    /** @deprecated use `JobInIntegrations$inboundSchema` instead. */
    const inboundSchema: z.ZodType<WandbIntegration, z.ZodTypeDef, unknown>;
    /** @deprecated use `JobInIntegrations$outboundSchema` instead. */
    const outboundSchema: z.ZodType<WandbIntegration$Outbound, z.ZodTypeDef, WandbIntegration>;
    /** @deprecated use `JobInIntegrations$Outbound` instead. */
    type Outbound = JobInIntegrations$Outbound;
}
export declare function jobInIntegrationsToJSON(jobInIntegrations: JobInIntegrations): string;
export declare function jobInIntegrationsFromJSON(jsonString: string): SafeParseResult<JobInIntegrations, SDKValidationError>;
/** @internal */
export declare const Hyperparameters$inboundSchema: z.ZodType<Hyperparameters, z.ZodTypeDef, unknown>;
/** @internal */
export type Hyperparameters$Outbound = CompletionTrainingParametersIn$Outbound | ClassifierTrainingParametersIn$Outbound;
/** @internal */
export declare const Hyperparameters$outboundSchema: z.ZodType<Hyperparameters$Outbound, z.ZodTypeDef, Hyperparameters>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Hyperparameters$ {
    /** @deprecated use `Hyperparameters$inboundSchema` instead. */
    const inboundSchema: z.ZodType<Hyperparameters, z.ZodTypeDef, unknown>;
    /** @deprecated use `Hyperparameters$outboundSchema` instead. */
    const outboundSchema: z.ZodType<Hyperparameters$Outbound, z.ZodTypeDef, Hyperparameters>;
    /** @deprecated use `Hyperparameters$Outbound` instead. */
    type Outbound = Hyperparameters$Outbound;
}
export declare function hyperparametersToJSON(hyperparameters: Hyperparameters): string;
export declare function hyperparametersFromJSON(jsonString: string): SafeParseResult<Hyperparameters, SDKValidationError>;
/** @internal */
export declare const JobInRepositories$inboundSchema: z.ZodType<JobInRepositories, z.ZodTypeDef, unknown>;
/** @internal */
export type JobInRepositories$Outbound = GithubRepositoryIn$Outbound;
/** @internal */
export declare const JobInRepositories$outboundSchema: z.ZodType<JobInRepositories$Outbound, z.ZodTypeDef, JobInRepositories>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace JobInRepositories$ {
    /** @deprecated use `JobInRepositories$inboundSchema` instead. */
    const inboundSchema: z.ZodType<GithubRepositoryIn, z.ZodTypeDef, unknown>;
    /** @deprecated use `JobInRepositories$outboundSchema` instead. */
    const outboundSchema: z.ZodType<GithubRepositoryIn$Outbound, z.ZodTypeDef, GithubRepositoryIn>;
    /** @deprecated use `JobInRepositories$Outbound` instead. */
    type Outbound = JobInRepositories$Outbound;
}
export declare function jobInRepositoriesToJSON(jobInRepositories: JobInRepositories): string;
export declare function jobInRepositoriesFromJSON(jsonString: string): SafeParseResult<JobInRepositories, SDKValidationError>;
/** @internal */
export declare const JobIn$inboundSchema: z.ZodType<JobIn, z.ZodTypeDef, unknown>;
/** @internal */
export type JobIn$Outbound = {
    model: string;
    training_files?: Array<TrainingFile$Outbound> | undefined;
    validation_files?: Array<string> | null | undefined;
    suffix?: string | null | undefined;
    integrations?: Array<WandbIntegration$Outbound> | null | undefined;
    auto_start?: boolean | undefined;
    invalid_sample_skip_percentage: number;
    job_type?: string | null | undefined;
    hyperparameters: CompletionTrainingParametersIn$Outbound | ClassifierTrainingParametersIn$Outbound;
    repositories?: Array<GithubRepositoryIn$Outbound> | null | undefined;
    classifier_targets?: Array<ClassifierTargetIn$Outbound> | null | undefined;
};
/** @internal */
export declare const JobIn$outboundSchema: z.ZodType<JobIn$Outbound, z.ZodTypeDef, JobIn>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace JobIn$ {
    /** @deprecated use `JobIn$inboundSchema` instead. */
    const inboundSchema: z.ZodType<JobIn, z.ZodTypeDef, unknown>;
    /** @deprecated use `JobIn$outboundSchema` instead. */
    const outboundSchema: z.ZodType<JobIn$Outbound, z.ZodTypeDef, JobIn>;
    /** @deprecated use `JobIn$Outbound` instead. */
    type Outbound = JobIn$Outbound;
}
export declare function jobInToJSON(jobIn: JobIn): string;
export declare function jobInFromJSON(jsonString: string): SafeParseResult<JobIn, SDKValidationError>;
//# sourceMappingURL=jobin.d.ts.map