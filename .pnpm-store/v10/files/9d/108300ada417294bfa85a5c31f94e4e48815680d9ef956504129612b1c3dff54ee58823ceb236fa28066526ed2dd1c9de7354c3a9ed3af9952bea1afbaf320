import { createPaginator } from "@smithy/core";
import { ListAutoMLJobsCommand, } from "../commands/ListAutoMLJobsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListAutoMLJobs = createPaginator(SageMakerClient, ListAutoMLJobsCommand, "NextToken", "NextToken", "MaxResults");
