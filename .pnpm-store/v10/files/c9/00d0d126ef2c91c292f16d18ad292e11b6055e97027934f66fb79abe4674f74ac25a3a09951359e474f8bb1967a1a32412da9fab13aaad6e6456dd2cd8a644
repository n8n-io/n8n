import { createPaginator } from "@smithy/core";
import { ListMonitoringSchedulesCommand, } from "../commands/ListMonitoringSchedulesCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListMonitoringSchedules = createPaginator(SageMakerClient, ListMonitoringSchedulesCommand, "NextToken", "NextToken", "MaxResults");
