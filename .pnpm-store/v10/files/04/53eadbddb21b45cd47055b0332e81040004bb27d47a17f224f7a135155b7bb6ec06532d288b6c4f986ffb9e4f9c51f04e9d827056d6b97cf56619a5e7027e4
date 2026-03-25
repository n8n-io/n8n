import { createPaginator } from "@smithy/core";
import { ListHyperParameterTuningJobsCommand, } from "../commands/ListHyperParameterTuningJobsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListHyperParameterTuningJobs = createPaginator(SageMakerClient, ListHyperParameterTuningJobsCommand, "NextToken", "NextToken", "MaxResults");
