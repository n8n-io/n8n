import { createPaginator } from "@smithy/core";
import { ListLineageGroupsCommand, } from "../commands/ListLineageGroupsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListLineageGroups = createPaginator(SageMakerClient, ListLineageGroupsCommand, "NextToken", "NextToken", "MaxResults");
