import { createPaginator } from "@smithy/core";
import { ListTrialComponentsCommand, } from "../commands/ListTrialComponentsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListTrialComponents = createPaginator(SageMakerClient, ListTrialComponentsCommand, "NextToken", "NextToken", "MaxResults");
