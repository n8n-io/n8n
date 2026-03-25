import { createPaginator } from "@smithy/core";
import { ListPipelinesCommand, } from "../commands/ListPipelinesCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListPipelines = createPaginator(SageMakerClient, ListPipelinesCommand, "NextToken", "NextToken", "MaxResults");
