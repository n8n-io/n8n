import { createPaginator } from "@smithy/core";
import { ListOptimizationJobsCommand, } from "../commands/ListOptimizationJobsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListOptimizationJobs = createPaginator(SageMakerClient, ListOptimizationJobsCommand, "NextToken", "NextToken", "MaxResults");
