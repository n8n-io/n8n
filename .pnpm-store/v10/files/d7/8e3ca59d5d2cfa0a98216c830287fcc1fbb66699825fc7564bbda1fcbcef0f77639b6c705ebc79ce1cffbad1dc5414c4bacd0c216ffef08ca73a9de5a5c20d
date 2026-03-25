import { createPaginator } from "@smithy/core";
import { ListClusterSchedulerConfigsCommand, } from "../commands/ListClusterSchedulerConfigsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListClusterSchedulerConfigs = createPaginator(SageMakerClient, ListClusterSchedulerConfigsCommand, "NextToken", "NextToken", "MaxResults");
