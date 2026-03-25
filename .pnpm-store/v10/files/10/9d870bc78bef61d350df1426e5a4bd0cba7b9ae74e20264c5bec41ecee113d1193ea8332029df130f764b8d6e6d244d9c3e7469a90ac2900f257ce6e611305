import { createPaginator } from "@smithy/core";
import { ListModelPackageGroupsCommand, } from "../commands/ListModelPackageGroupsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListModelPackageGroups = createPaginator(SageMakerClient, ListModelPackageGroupsCommand, "NextToken", "NextToken", "MaxResults");
