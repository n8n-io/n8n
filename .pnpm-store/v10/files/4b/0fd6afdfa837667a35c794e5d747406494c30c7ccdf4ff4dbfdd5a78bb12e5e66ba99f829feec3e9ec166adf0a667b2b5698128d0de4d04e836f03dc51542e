import { createPaginator } from "@smithy/core";
import { ListDeviceFleetsCommand, } from "../commands/ListDeviceFleetsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListDeviceFleets = createPaginator(SageMakerClient, ListDeviceFleetsCommand, "NextToken", "NextToken", "MaxResults");
