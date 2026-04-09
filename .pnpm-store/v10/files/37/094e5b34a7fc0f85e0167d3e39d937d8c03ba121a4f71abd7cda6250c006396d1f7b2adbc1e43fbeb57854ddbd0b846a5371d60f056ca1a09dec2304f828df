import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
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
export declare const Status$outboundSchema: z.ZodNativeEnum<typeof Status>;
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
export declare function jobsApiRoutesFineTuningGetFineTuningJobsRequestToJSON(jobsApiRoutesFineTuningGetFineTuningJobsRequest: JobsApiRoutesFineTuningGetFineTuningJobsRequest): string;
//# sourceMappingURL=jobsapiroutesfinetuninggetfinetuningjobs.d.ts.map