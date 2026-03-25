import { createPaginator } from "@smithy/core";
import { ListFeatureGroupsCommand, } from "../commands/ListFeatureGroupsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListFeatureGroups = createPaginator(SageMakerClient, ListFeatureGroupsCommand, "NextToken", "NextToken", "MaxResults");
