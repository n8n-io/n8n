import { createPaginator } from "@smithy/core";
import { ListModelCardVersionsCommand, } from "../commands/ListModelCardVersionsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListModelCardVersions = createPaginator(SageMakerClient, ListModelCardVersionsCommand, "NextToken", "NextToken", "MaxResults");
