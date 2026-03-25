import { createPaginator } from "@smithy/core";
import { ListAppImageConfigsCommand, } from "../commands/ListAppImageConfigsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListAppImageConfigs = createPaginator(SageMakerClient, ListAppImageConfigsCommand, "NextToken", "NextToken", "MaxResults");
