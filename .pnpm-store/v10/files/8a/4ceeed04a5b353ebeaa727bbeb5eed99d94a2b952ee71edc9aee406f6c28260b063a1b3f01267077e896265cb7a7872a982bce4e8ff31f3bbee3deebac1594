import { createPaginator } from "@smithy/core";
import { ListContextsCommand, } from "../commands/ListContextsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListContexts = createPaginator(SageMakerClient, ListContextsCommand, "NextToken", "NextToken", "MaxResults");
