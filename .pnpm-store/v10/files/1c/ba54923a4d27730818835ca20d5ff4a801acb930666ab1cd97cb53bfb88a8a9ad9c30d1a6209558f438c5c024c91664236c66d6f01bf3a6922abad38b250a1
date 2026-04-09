import * as z from "zod/v3";
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
export type JobInIntegrations$Outbound = WandbIntegration$Outbound;
/** @internal */
export declare const JobInIntegrations$outboundSchema: z.ZodType<JobInIntegrations$Outbound, z.ZodTypeDef, JobInIntegrations>;
export declare function jobInIntegrationsToJSON(jobInIntegrations: JobInIntegrations): string;
/** @internal */
export type Hyperparameters$Outbound = CompletionTrainingParametersIn$Outbound | ClassifierTrainingParametersIn$Outbound;
/** @internal */
export declare const Hyperparameters$outboundSchema: z.ZodType<Hyperparameters$Outbound, z.ZodTypeDef, Hyperparameters>;
export declare function hyperparametersToJSON(hyperparameters: Hyperparameters): string;
/** @internal */
export type JobInRepositories$Outbound = GithubRepositoryIn$Outbound;
/** @internal */
export declare const JobInRepositories$outboundSchema: z.ZodType<JobInRepositories$Outbound, z.ZodTypeDef, JobInRepositories>;
export declare function jobInRepositoriesToJSON(jobInRepositories: JobInRepositories): string;
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
export declare function jobInToJSON(jobIn: JobIn): string;
//# sourceMappingURL=jobin.d.ts.map