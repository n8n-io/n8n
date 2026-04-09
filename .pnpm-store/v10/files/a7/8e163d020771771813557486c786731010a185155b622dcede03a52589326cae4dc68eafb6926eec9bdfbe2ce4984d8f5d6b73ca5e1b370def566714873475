import { createPaginator } from "@smithy/core";
import { ListClusterEventsCommand, } from "../commands/ListClusterEventsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListClusterEvents = createPaginator(SageMakerClient, ListClusterEventsCommand, "NextToken", "NextToken", "MaxResults");
