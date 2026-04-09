import { createPaginator } from "@smithy/core";
import { ListMlflowAppsCommand, } from "../commands/ListMlflowAppsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListMlflowApps = createPaginator(SageMakerClient, ListMlflowAppsCommand, "NextToken", "NextToken", "MaxResults");
