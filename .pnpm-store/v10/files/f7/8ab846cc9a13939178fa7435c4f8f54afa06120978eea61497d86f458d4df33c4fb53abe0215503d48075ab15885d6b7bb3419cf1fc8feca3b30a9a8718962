import { createPaginator } from "@smithy/core";
import { ListActionsCommand } from "../commands/ListActionsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListActions = createPaginator(SageMakerClient, ListActionsCommand, "NextToken", "NextToken", "MaxResults");
