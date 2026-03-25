import { createPaginator } from "@smithy/core";
import { ListResourceCatalogsCommand, } from "../commands/ListResourceCatalogsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListResourceCatalogs = createPaginator(SageMakerClient, ListResourceCatalogsCommand, "NextToken", "NextToken", "MaxResults");
