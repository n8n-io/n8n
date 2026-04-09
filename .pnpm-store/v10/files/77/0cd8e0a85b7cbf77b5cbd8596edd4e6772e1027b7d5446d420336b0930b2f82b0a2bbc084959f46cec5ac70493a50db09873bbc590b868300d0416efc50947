import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CheckpointOut } from "./checkpointout.js";
import { ClassifierTargetOut } from "./classifiertargetout.js";
import { ClassifierTrainingParameters } from "./classifiertrainingparameters.js";
import { EventOut } from "./eventout.js";
import { JobMetadataOut } from "./jobmetadataout.js";
import { WandbIntegrationOut } from "./wandbintegrationout.js";
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
export type ClassifierDetailedJobOutIntegrations = WandbIntegrationOut;
export type ClassifierDetailedJobOut = {
    id: string;
    autoStart: boolean;
    model: string;
    status: ClassifierDetailedJobOutStatus;
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
    jobType?: "classifier" | undefined;
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
export declare const ClassifierDetailedJobOutIntegrations$inboundSchema: z.ZodType<ClassifierDetailedJobOutIntegrations, z.ZodTypeDef, unknown>;
export declare function classifierDetailedJobOutIntegrationsFromJSON(jsonString: string): SafeParseResult<ClassifierDetailedJobOutIntegrations, SDKValidationError>;
/** @internal */
export declare const ClassifierDetailedJobOut$inboundSchema: z.ZodType<ClassifierDetailedJobOut, z.ZodTypeDef, unknown>;
export declare function classifierDetailedJobOutFromJSON(jsonString: string): SafeParseResult<ClassifierDetailedJobOut, SDKValidationError>;
//# sourceMappingURL=classifierdetailedjobout.d.ts.map