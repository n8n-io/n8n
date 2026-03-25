import { createPaginator } from "@smithy/core";
import { ListClustersCommand, } from "../commands/ListClustersCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListClusters = createPaginator(SageMakerClient, ListClustersCommand, "NextToken", "NextToken", "MaxResults");
