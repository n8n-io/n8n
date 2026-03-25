import { createPaginator } from "@smithy/core";
import { ListStageDevicesCommand, } from "../commands/ListStageDevicesCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListStageDevices = createPaginator(SageMakerClient, ListStageDevicesCommand, "NextToken", "NextToken", "MaxResults");
