import { createPaginator } from "@smithy/core";
import { ListDevicesCommand } from "../commands/ListDevicesCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListDevices = createPaginator(SageMakerClient, ListDevicesCommand, "NextToken", "NextToken", "MaxResults");
