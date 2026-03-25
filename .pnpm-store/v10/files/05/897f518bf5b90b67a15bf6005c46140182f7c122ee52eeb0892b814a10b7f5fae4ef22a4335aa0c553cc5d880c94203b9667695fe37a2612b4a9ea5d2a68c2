import { createPaginator } from "@smithy/core";
import { ListSubscribedWorkteamsCommand, } from "../commands/ListSubscribedWorkteamsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListSubscribedWorkteams = createPaginator(SageMakerClient, ListSubscribedWorkteamsCommand, "NextToken", "NextToken", "MaxResults");
