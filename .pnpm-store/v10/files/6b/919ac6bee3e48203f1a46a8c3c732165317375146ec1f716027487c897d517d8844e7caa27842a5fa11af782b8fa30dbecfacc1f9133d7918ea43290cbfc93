import { createPaginator } from "@smithy/core";
import { ListTagsCommand } from "../commands/ListTagsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListTags = createPaginator(SageMakerClient, ListTagsCommand, "NextToken", "NextToken", "MaxResults");
