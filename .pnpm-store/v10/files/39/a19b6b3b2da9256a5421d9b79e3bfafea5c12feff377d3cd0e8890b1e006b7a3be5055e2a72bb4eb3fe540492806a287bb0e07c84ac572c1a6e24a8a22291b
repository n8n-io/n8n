import { createPaginator } from "@smithy/core";
import { ListAlgorithmsCommand, } from "../commands/ListAlgorithmsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListAlgorithms = createPaginator(SageMakerClient, ListAlgorithmsCommand, "NextToken", "NextToken", "MaxResults");
