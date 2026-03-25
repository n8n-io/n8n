import { createPaginator } from "@smithy/core";
import { ListEndpointsCommand, } from "../commands/ListEndpointsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListEndpoints = createPaginator(SageMakerClient, ListEndpointsCommand, "NextToken", "NextToken", "MaxResults");
