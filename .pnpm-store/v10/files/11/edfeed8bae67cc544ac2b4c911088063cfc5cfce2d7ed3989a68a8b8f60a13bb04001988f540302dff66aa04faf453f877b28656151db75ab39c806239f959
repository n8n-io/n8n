import { createPaginator } from "@smithy/core";
import { ListTransformJobsCommand, } from "../commands/ListTransformJobsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListTransformJobs = createPaginator(SageMakerClient, ListTransformJobsCommand, "NextToken", "NextToken", "MaxResults");
