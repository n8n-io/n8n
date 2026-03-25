import { createPaginator } from "@smithy/core";
import { ListMlflowTrackingServersCommand, } from "../commands/ListMlflowTrackingServersCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListMlflowTrackingServers = createPaginator(SageMakerClient, ListMlflowTrackingServersCommand, "NextToken", "NextToken", "MaxResults");
