import { createPaginator } from "@smithy/core";
import { ListTrainingJobsCommand, } from "../commands/ListTrainingJobsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListTrainingJobs = createPaginator(SageMakerClient, ListTrainingJobsCommand, "NextToken", "NextToken", "MaxResults");
