import { createPaginator } from "@smithy/core";
import { ListClusterNodesCommand, } from "../commands/ListClusterNodesCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListClusterNodes = createPaginator(SageMakerClient, ListClusterNodesCommand, "NextToken", "NextToken", "MaxResults");
