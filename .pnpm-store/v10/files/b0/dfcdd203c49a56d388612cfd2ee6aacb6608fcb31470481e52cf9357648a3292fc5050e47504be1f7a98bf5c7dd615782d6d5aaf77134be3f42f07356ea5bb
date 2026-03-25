import { createPaginator } from "@smithy/core";
import { ListMonitoringAlertsCommand, } from "../commands/ListMonitoringAlertsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListMonitoringAlerts = createPaginator(SageMakerClient, ListMonitoringAlertsCommand, "NextToken", "NextToken", "MaxResults");
