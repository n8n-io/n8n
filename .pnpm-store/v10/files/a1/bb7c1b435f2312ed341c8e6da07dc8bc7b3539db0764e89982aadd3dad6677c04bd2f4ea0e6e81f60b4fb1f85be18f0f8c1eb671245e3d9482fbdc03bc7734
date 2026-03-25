import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CheckpointOut, CheckpointOut$Outbound } from "./checkpointout.js";
import { ClassifierTargetOut, ClassifierTargetOut$Outbound } from "./classifiertargetout.js";
import { ClassifierTrainingParameters, ClassifierTrainingParameters$Outbound } from "./classifiertrainingparameters.js";
import { EventOut, EventOut$Outbound } from "./eventout.js";
import { JobMetadataOut, JobMetadataOut$Outbound } from "./jobmetadataout.js";
import { WandbIntegrationOut, WandbIntegrationOut$Outbound } from "./wandbintegrationout.js";
export declare const ClassifierDetailedJobOutStatus: {
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
export type ClassifierDetailedJobOutStatus = ClosedEnum<typeof ClassifierDetailedJobOutStatus>;
export declare const ClassifierDetailedJobOutObject: {
    readonly Job: "job";
};
export type ClassifierDetailedJobOutObject = ClosedEnum<typeof ClassifierDetailedJobOutObject>;
export type ClassifierDetailedJobOutIntegrations = WandbIntegrationOut;
export declare const ClassifierDetailedJobOutJobType: {
    readonly Classifier: "classifier";
};
export type ClassifierDetailedJobOutJobType = ClosedEnum<typeof ClassifierDetailedJobOutJobType>;
export type ClassifierDetailedJobOut = {
    id: string;
    autoStart: boolean;
    /**
     * The name of the model to fine-tune.
     */
    model: string;
    status: ClassifierDetailedJobOutStatus;
    createdAt: number;
    modifiedAt: number;
    trainingFiles: Array<string>;
    validationFiles?: Array<string> | null | undefined;
    object?: ClassifierDetailedJobOutObject | undefined;
    fineTunedModel?: string | null | undefined;
    suffix?: string | null | undefined;
    integrations?: Array<WandbIntegrationOut> | null | undefined;
    trainedTokens?: number | null | undefined;
    metadata?: JobMetadataOut | null | undefined;
    jobType?: ClassifierDetailedJobOutJobType | undefined;
    hyperparameters: ClassifierTrainingParameters;
    /**
     * Event items are created every time the status of a fine-tuning job changes. The timestamped list of all events is accessible here.
     */
    events?: Array<EventOut> | undefined;
    checkpoints?: Array<CheckpointOut> | undefined;
    classifierTargets: Array<ClassifierTargetOut>;
};
/** @internal */
export declare const ClassifierDetailedJobOutStatus$inboundSchema: z.ZodNativeEnum<typeof ClassifierDetailedJobOutStatus>;
/** @internal */
export declare const ClassifierDetailedJobOutStatus$outboundSchema: z.ZodNativeEnum<typeof ClassifierDetailedJobOutStatus>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassifierDetailedJobOutStatus$ {
    /** @deprecated use `ClassifierDetailedJobOutStatus$inboundSchema` instead. */
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
    /** @deprecated use `ClassifierDetailedJobOutStatus$outboundSchema` instead. */
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
export declare const ClassifierDetailedJobOutObject$inboundSchema: z.ZodNativeEnum<typeof ClassifierDetailedJobOutObject>;
/** @internal */
export declare const ClassifierDetailedJobOutObject$outboundSchema: z.ZodNativeEnum<typeof ClassifierDetailedJobOutObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassifierDetailedJobOutObject$ {
    /** @deprecated use `ClassifierDetailedJobOutObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Job: "job";
    }>;
    /** @deprecated use `ClassifierDetailedJobOutObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Job: "job";
    }>;
}
/** @internal */
export declare const ClassifierDetailedJobOutIntegrations$inboundSchema: z.ZodType<ClassifierDetailedJobOutIntegrations, z.ZodTypeDef, unknown>;
/** @internal */
export type ClassifierDetailedJobOutIntegrations$Outbound = WandbIntegrationOut$Outbound;
/** @internal */
export declare const ClassifierDetailedJobOutIntegrations$outboundSchema: z.ZodType<ClassifierDetailedJobOutIntegrations$Outbound, z.ZodTypeDef, ClassifierDetailedJobOutIntegrations>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassifierDetailedJobOutIntegrations$ {
    /** @deprecated use `ClassifierDetailedJobOutIntegrations$inboundSchema` instead. */
    const inboundSchema: z.ZodType<WandbIntegrationOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `ClassifierDetailedJobOutIntegrations$outboundSchema` instead. */
    const outboundSchema: z.ZodType<WandbIntegrationOut$Outbound, z.ZodTypeDef, WandbIntegrationOut>;
    /** @deprecated use `ClassifierDetailedJobOutIntegrations$Outbound` instead. */
    type Outbound = ClassifierDetailedJobOutIntegrations$Outbound;
}
export declare function classifierDetailedJobOutIntegrationsToJSON(classifierDetailedJobOutIntegrations: ClassifierDetailedJobOutIntegrations): string;
export declare function classifierDetailedJobOutIntegrationsFromJSON(jsonString: string): SafeParseResult<ClassifierDetailedJobOutIntegrations, SDKValidationError>;
/** @internal */
export declare const ClassifierDetailedJobOutJobType$inboundSchema: z.ZodNativeEnum<typeof ClassifierDetailedJobOutJobType>;
/** @internal */
export declare const ClassifierDetailedJobOutJobType$outboundSchema: z.ZodNativeEnum<typeof ClassifierDetailedJobOutJobType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassifierDetailedJobOutJobType$ {
    /** @deprecated use `ClassifierDetailedJobOutJobType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Classifier: "classifier";
    }>;
    /** @deprecated use `ClassifierDetailedJobOutJobType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Classifier: "classifier";
    }>;
}
/** @internal */
export declare const ClassifierDetailedJobOut$inboundSchema: z.ZodType<ClassifierDetailedJobOut, z.ZodTypeDef, unknown>;
/** @internal */
export type ClassifierDetailedJobOut$Outbound = {
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
    events?: Array<EventOut$Outbound> | undefined;
    checkpoints?: Array<CheckpointOut$Outbound> | undefined;
    classifier_targets: Array<ClassifierTargetOut$Outbound>;
};
/** @internal */
export declare const ClassifierDetailedJobOut$outboundSchema: z.ZodType<ClassifierDetailedJobOut$Outbound, z.ZodTypeDef, ClassifierDetailedJobOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ClassifierDetailedJobOut$ {
    /** @deprecated use `ClassifierDetailedJobOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ClassifierDetailedJobOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `ClassifierDetailedJobOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ClassifierDetailedJobOut$Outbound, z.ZodTypeDef, ClassifierDetailedJobOut>;
    /** @deprecated use `ClassifierDetailedJobOut$Outbound` instead. */
    type Outbound = ClassifierDetailedJobOut$Outbound;
}
export declare function classifierDetailedJobOutToJSON(classifierDetailedJobOut: ClassifierDetailedJobOut): string;
export declare function classifierDetailedJobOutFromJSON(jsonString: string): SafeParseResult<ClassifierDetailedJobOut, SDKValidationError>;
//# sourceMappingURL=classifierdetailedjobout.d.ts.map