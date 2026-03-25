import { createPaginator } from "@smithy/core";
import { ListPartnerAppsCommand, } from "../commands/ListPartnerAppsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListPartnerApps = createPaginator(SageMakerClient, ListPartnerAppsCommand, "NextToken", "NextToken", "MaxResults");
