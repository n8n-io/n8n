import { createPaginator } from "@smithy/core";
import { ListModelsCommand } from "../commands/ListModelsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListModels = createPaginator(SageMakerClient, ListModelsCommand, "NextToken", "NextToken", "MaxResults");
