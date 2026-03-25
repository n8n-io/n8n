import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
/**
 * The current job state to filter on. When set, the other results are not displayed.
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
 * The current job state to filter on. When set, the other results are not displayed.
 */
export type Status = ClosedEnum<typeof Status>;
export type JobsApiRoutesFineTuningGetFineTuningJobsRequest = {
    /**
     * The page number of the results to be returned.
     */
    page?: number | undefined;
    /**
     * The number of items to return per page.
     */
    pageSize?: number | undefined;
    /**
     * The model name used for fine-tuning to filter on. When set, the other results are not displayed.
     */
    model?: string | null | undefined;
    /**
     * The date/time to filter on. When set, the results for previous creation times are not displayed.
     */
    createdAfter?: Date | null | undefined;
    createdBefore?: Date | null | undefined;
    /**
     * When set, only return results for jobs created by the API caller. Other results are not displayed.
     */
    createdByMe?: boolean | undefined;
    /**
     * The current job state to filter on. When set, the other results are not displayed.
     */
    status?: Status | null | undefined;
    /**
     * The Weights and Biases project to filter on. When set, the other results are not displayed.
     */
    wandbProject?: string | null | undefined;
    /**
     * The Weight and Biases run name to filter on. When set, the other results are not displayed.
     */
    wandbName?: string | null | undefined;
    /**
     * The model suffix to filter on. When set, the other results are not displayed.
     */
    suffix?: string | null | undefined;
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
export declare const JobsApiRoutesFineTuningGetFineTuningJobsRequest$inboundSchema: z.ZodType<JobsApiRoutesFineTuningGetFineTuningJobsRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type JobsApiRoutesFineTuningGetFineTuningJobsRequest$Outbound = {
    page: number;
    page_size: number;
    model?: string | null | undefined;
    created_after?: string | null | undefined;
    created_before?: string | null | undefined;
    created_by_me: boolean;
    status?: string | null | undefined;
    wandb_project?: string | null | undefined;
    wandb_name?: string | null | undefined;
    suffix?: string | null | undefined;
};
/** @internal */
export declare const JobsApiRoutesFineTuningGetFineTuningJobsRequest$outboundSchema: z.ZodType<JobsApiRoutesFineTuningGetFineTuningJobsRequest$Outbound, z.ZodTypeDef, JobsApiRoutesFineTuningGetFineTuningJobsRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace JobsApiRoutesFineTuningGetFineTuningJobsRequest$ {
    /** @deprecated use `JobsApiRoutesFineTuningGetFineTuningJobsRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<JobsApiRoutesFineTuningGetFineTuningJobsRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `JobsApiRoutesFineTuningGetFineTuningJobsRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<JobsApiRoutesFineTuningGetFineTuningJobsRequest$Outbound, z.ZodTypeDef, JobsApiRoutesFineTuningGetFineTuningJobsRequest>;
    /** @deprecated use `JobsApiRoutesFineTuningGetFineTuningJobsRequest$Outbound` instead. */
    type Outbound = JobsApiRoutesFineTuningGetFineTuningJobsRequest$Outbound;
}
export declare function jobsApiRoutesFineTuningGetFineTuningJobsRequestToJSON(jobsApiRoutesFineTuningGetFineTuningJobsRequest: JobsApiRoutesFineTuningGetFineTuningJobsRequest): string;
export declare function jobsApiRoutesFineTuningGetFineTuningJobsRequestFromJSON(jsonString: string): SafeParseResult<JobsApiRoutesFineTuningGetFineTuningJobsRequest, SDKValidationError>;
//# sourceMappingURL=jobsapiroutesfinetuninggetfinetuningjobs.d.ts.map