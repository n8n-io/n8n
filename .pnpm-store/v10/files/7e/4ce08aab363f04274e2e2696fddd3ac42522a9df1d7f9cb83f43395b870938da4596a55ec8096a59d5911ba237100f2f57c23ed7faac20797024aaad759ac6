import { createPaginator } from "@smithy/core";
import { ListProcessingJobsCommand, } from "../commands/ListProcessingJobsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListProcessingJobs = createPaginator(SageMakerClient, ListProcessingJobsCommand, "NextToken", "NextToken", "MaxResults");
