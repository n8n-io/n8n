import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type JobsApiRoutesBatchGetBatchJobsRequest = {
    page?: number | undefined;
    pageSize?: number | undefined;
    model?: string | null | undefined;
    agentId?: string | null | undefined;
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    createdAfter?: Date | null | undefined;
    createdByMe?: boolean | undefined;
    status?: Array<components.BatchJobStatus> | null | undefined;
};
/** @internal */
export declare const JobsApiRoutesBatchGetBatchJobsRequest$inboundSchema: z.ZodType<JobsApiRoutesBatchGetBatchJobsRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type JobsApiRoutesBatchGetBatchJobsRequest$Outbound = {
    page: number;
    page_size: number;
    model?: string | null | undefined;
    agent_id?: string | null | undefined;
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    created_after?: string | null | undefined;
    created_by_me: boolean;
    status?: Array<string> | null | undefined;
};
/** @internal */
export declare const JobsApiRoutesBatchGetBatchJobsRequest$outboundSchema: z.ZodType<JobsApiRoutesBatchGetBatchJobsRequest$Outbound, z.ZodTypeDef, JobsApiRoutesBatchGetBatchJobsRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace JobsApiRoutesBatchGetBatchJobsRequest$ {
    /** @deprecated use `JobsApiRoutesBatchGetBatchJobsRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<JobsApiRoutesBatchGetBatchJobsRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `JobsApiRoutesBatchGetBatchJobsRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<JobsApiRoutesBatchGetBatchJobsRequest$Outbound, z.ZodTypeDef, JobsApiRoutesBatchGetBatchJobsRequest>;
    /** @deprecated use `JobsApiRoutesBatchGetBatchJobsRequest$Outbound` instead. */
    type Outbound = JobsApiRoutesBatchGetBatchJobsRequest$Outbound;
}
export declare function jobsApiRoutesBatchGetBatchJobsRequestToJSON(jobsApiRoutesBatchGetBatchJobsRequest: JobsApiRoutesBatchGetBatchJobsRequest): string;
export declare function jobsApiRoutesBatchGetBatchJobsRequestFromJSON(jsonString: string): SafeParseResult<JobsApiRoutesBatchGetBatchJobsRequest, SDKValidationError>;
//# sourceMappingURL=jobsapiroutesbatchgetbatchjobs.d.ts.map