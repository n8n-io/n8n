import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ClassifierTrainingParameters, ClassifierTrainingParameters$Outbound } from "./classifiertrainingparameters.js";
import { JobMetadataOut, JobMetadataOut$Outbound } from "./jobmetadataout.js";
import { WandbIntegrationOut, WandbIntegrationOut$Outbound } from "./wandbintegrationout.js";
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
/**
 * The object type of the fine-tuning job.
 */
export declare const ClassifierJobOutObject: {
    readonly Job: "job";
};
/**
 * The object type of the fine-tuning job.
 */
export type ClassifierJobOutObject = ClosedEnum<typeof ClassifierJobOutObject>;
export type ClassifierJobOutIntegrations = WandbIntegrationOut;
/**
 * The type of job (`FT` for fine-tuning).
 */
export declare const ClassifierJobOutJobType: {
    readonly Classifier: "classifier";
};
/**
 * The type of job (`FT` for fine-tuning).
 */
export type ClassifierJobOutJobType = ClosedEnum<typeof ClassifierJobOutJobType>;
export type ClassifierJobOut = {
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
    object?: ClassifierJobOutObject | undefined;
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
    jobType?: ClassifierJobOutJobType | undefined;
    hyperparameters: ClassifierTrainingParameters;
};
/** @internal */
export declare const ClassifierJobOutStatus$inboundSchema: z.ZodNativeEnum<typeof ClassifierJobOutStatus>;
/** @internal */
export declare const ClassifierJobOutStatus$outboundSchema: z.ZodNativeEnum<typeof ClassifierJobOutStatus>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassifierJobOutStatus$ {
    /** @deprecated use `ClassifierJobOutStatus$inboundSchema` instead. */
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
    /** @deprecated use `ClassifierJobOutStatus$outboundSchema` instead. */
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
export declare const ClassifierJobOutObject$inboundSchema: z.ZodNativeEnum<typeof ClassifierJobOutObject>;
/** @internal */
export declare const ClassifierJobOutObject$outboundSchema: z.ZodNativeEnum<typeof ClassifierJobOutObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassifierJobOutObject$ {
    /** @deprecated use `ClassifierJobOutObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Job: "job";
    }>;
    /** @deprecated use `ClassifierJobOutObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Job: "job";
    }>;
}
/** @internal */
export declare const ClassifierJobOutIntegrations$inboundSchema: z.ZodType<ClassifierJobOutIntegrations, z.ZodTypeDef, unknown>;
/** @internal */
export type ClassifierJobOutIntegrations$Outbound = WandbIntegrationOut$Outbound;
/** @internal */
export declare const ClassifierJobOutIntegrations$outboundSchema: z.ZodType<ClassifierJobOutIntegrations$Outbound, z.ZodTypeDef, ClassifierJobOutIntegrations>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassifierJobOutIntegrations$ {
    /** @deprecated use `ClassifierJobOutIntegrations$inboundSchema` instead. */
    const inboundSchema: z.ZodType<WandbIntegrationOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `ClassifierJobOutIntegrations$outboundSchema` instead. */
    const outboundSchema: z.ZodType<WandbIntegrationOut$Outbound, z.ZodTypeDef, WandbIntegrationOut>;
    /** @deprecated use `ClassifierJobOutIntegrations$Outbound` instead. */
    type Outbound = ClassifierJobOutIntegrations$Outbound;
}
export declare function classifierJobOutIntegrationsToJSON(classifierJobOutIntegrations: ClassifierJobOutIntegrations): string;
export declare function classifierJobOutIntegrationsFromJSON(jsonString: string): SafeParseResult<ClassifierJobOutIntegrations, SDKValidationError>;
/** @internal */
export declare const ClassifierJobOutJobType$inboundSchema: z.ZodNativeEnum<typeof ClassifierJobOutJobType>;
/** @internal */
export declare const ClassifierJobOutJobType$outboundSchema: z.ZodNativeEnum<typeof ClassifierJobOutJobType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassifierJobOutJobType$ {
    /** @deprecated use `ClassifierJobOutJobType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Classifier: "classifier";
    }>;
    /** @deprecated use `ClassifierJobOutJobType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Classifier: "classifier";
    }>;
}
/** @internal */
export declare const ClassifierJobOut$inboundSchema: z.ZodType<ClassifierJobOut, z.ZodTypeDef, unknown>;
/** @internal */
export type ClassifierJobOut$Outbound = {
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
    hyperparameters: ClassifierTrainingParameters$Outbound;
};
/** @internal */
export declare const ClassifierJobOut$outboundSchema: z.ZodType<ClassifierJobOut$Outbound, z.ZodTypeDef, ClassifierJobOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassifierJobOut$ {
    /** @deprecated use `ClassifierJobOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ClassifierJobOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `ClassifierJobOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ClassifierJobOut$Outbound, z.ZodTypeDef, ClassifierJobOut>;
    /** @deprecated use `ClassifierJobOut$Outbound` instead. */
    type Outbound = ClassifierJobOut$Outbound;
}
export declare function classifierJobOutToJSON(classifierJobOut: ClassifierJobOut): string;
export declare function classifierJobOutFromJSON(jsonString: string): SafeParseResult<ClassifierJobOut, SDKValidationError>;
//# sourceMappingURL=classifierjobout.d.ts.map