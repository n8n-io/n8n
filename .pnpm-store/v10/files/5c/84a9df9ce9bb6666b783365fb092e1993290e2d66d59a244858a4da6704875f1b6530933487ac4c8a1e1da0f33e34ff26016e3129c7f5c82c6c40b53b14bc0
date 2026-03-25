import { createPaginator } from "@smithy/core";
import { ListModelPackagesCommand, } from "../commands/ListModelPackagesCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListModelPackages = createPaginator(SageMakerClient, ListModelPackagesCommand, "NextToken", "NextToken", "MaxResults");
