import { createPaginator } from "@smithy/core";
import { ListTrainingPlansCommand, } from "../commands/ListTrainingPlansCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListTrainingPlans = createPaginator(SageMakerClient, ListTrainingPlansCommand, "NextToken", "NextToken", "MaxResults");
