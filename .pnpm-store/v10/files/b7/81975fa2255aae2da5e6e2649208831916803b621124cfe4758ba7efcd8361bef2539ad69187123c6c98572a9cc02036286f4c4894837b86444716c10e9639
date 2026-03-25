import { createPaginator } from "@smithy/core";
import { ListEdgePackagingJobsCommand, } from "../commands/ListEdgePackagingJobsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListEdgePackagingJobs = createPaginator(SageMakerClient, ListEdgePackagingJobsCommand, "NextToken", "NextToken", "MaxResults");
