import { createPaginator } from "@smithy/core";
import { ListEndpointConfigsCommand, } from "../commands/ListEndpointConfigsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListEndpointConfigs = createPaginator(SageMakerClient, ListEndpointConfigsCommand, "NextToken", "NextToken", "MaxResults");
