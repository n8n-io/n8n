import { createPaginator } from "@smithy/core";
import { ListModelCardsCommand, } from "../commands/ListModelCardsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListModelCards = createPaginator(SageMakerClient, ListModelCardsCommand, "NextToken", "NextToken", "MaxResults");
