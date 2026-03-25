import { createPaginator } from "@smithy/core";
import { ListMonitoringExecutionsCommand, } from "../commands/ListMonitoringExecutionsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListMonitoringExecutions = createPaginator(SageMakerClient, ListMonitoringExecutionsCommand, "NextToken", "NextToken", "MaxResults");
