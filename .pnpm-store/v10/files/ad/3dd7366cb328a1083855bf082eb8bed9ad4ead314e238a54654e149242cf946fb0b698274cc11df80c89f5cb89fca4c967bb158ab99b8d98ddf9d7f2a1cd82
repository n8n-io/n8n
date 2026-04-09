import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import * as components from "../components/index.js";
export declare const OrderBy: {
    readonly Created: "created";
    readonly MinusCreated: "-created";
};
export type OrderBy = ClosedEnum<typeof OrderBy>;
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
    orderBy?: OrderBy | undefined;
};
/** @internal */
export declare const OrderBy$outboundSchema: z.ZodNativeEnum<typeof OrderBy>;
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
    order_by: string;
};
/** @internal */
export declare const JobsApiRoutesBatchGetBatchJobsRequest$outboundSchema: z.ZodType<JobsApiRoutesBatchGetBatchJobsRequest$Outbound, z.ZodTypeDef, JobsApiRoutesBatchGetBatchJobsRequest>;
export declare function jobsApiRoutesBatchGetBatchJobsRequestToJSON(jobsApiRoutesBatchGetBatchJobsRequest: JobsApiRoutesBatchGetBatchJobsRequest): string;
//# sourceMappingURL=jobsapiroutesbatchgetbatchjobs.d.ts.map