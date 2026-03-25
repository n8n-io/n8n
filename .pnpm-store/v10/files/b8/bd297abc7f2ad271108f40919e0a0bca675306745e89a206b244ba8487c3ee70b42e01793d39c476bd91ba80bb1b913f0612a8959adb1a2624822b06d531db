import { createPaginator } from "@smithy/core";
import { ListImageVersionsCommand, } from "../commands/ListImageVersionsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListImageVersions = createPaginator(SageMakerClient, ListImageVersionsCommand, "NextToken", "NextToken", "MaxResults");
