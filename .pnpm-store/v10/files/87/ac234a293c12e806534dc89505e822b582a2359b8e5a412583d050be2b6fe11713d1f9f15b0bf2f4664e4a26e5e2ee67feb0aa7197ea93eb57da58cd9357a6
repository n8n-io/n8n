import { createPaginator } from "@smithy/core";
import { ListMonitoringAlertHistoryCommand, } from "../commands/ListMonitoringAlertHistoryCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListMonitoringAlertHistory = createPaginator(SageMakerClient, ListMonitoringAlertHistoryCommand, "NextToken", "NextToken", "MaxResults");
