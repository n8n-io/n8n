import { createPaginator } from "@smithy/core";
import { ListEdgeDeploymentPlansCommand, } from "../commands/ListEdgeDeploymentPlansCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListEdgeDeploymentPlans = createPaginator(SageMakerClient, ListEdgeDeploymentPlansCommand, "NextToken", "NextToken", "MaxResults");
