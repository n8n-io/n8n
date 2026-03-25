import { createPaginator } from "@smithy/core";
import { ListLabelingJobsCommand, } from "../commands/ListLabelingJobsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListLabelingJobs = createPaginator(SageMakerClient, ListLabelingJobsCommand, "NextToken", "NextToken", "MaxResults");
