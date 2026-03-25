import { createPaginator } from "@smithy/core";
import { ListAppsCommand } from "../commands/ListAppsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListApps = createPaginator(SageMakerClient, ListAppsCommand, "NextToken", "NextToken", "MaxResults");
