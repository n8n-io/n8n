import { createPaginator } from "@smithy/core";
import { ListCompilationJobsCommand, } from "../commands/ListCompilationJobsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListCompilationJobs = createPaginator(SageMakerClient, ListCompilationJobsCommand, "NextToken", "NextToken", "MaxResults");
