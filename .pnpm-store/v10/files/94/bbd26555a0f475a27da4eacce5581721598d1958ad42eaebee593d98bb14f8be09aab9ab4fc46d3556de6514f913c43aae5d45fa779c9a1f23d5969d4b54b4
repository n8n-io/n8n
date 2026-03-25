import { createPaginator } from "@smithy/core";
import { ListFlowDefinitionsCommand, } from "../commands/ListFlowDefinitionsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListFlowDefinitions = createPaginator(SageMakerClient, ListFlowDefinitionsCommand, "NextToken", "NextToken", "MaxResults");
