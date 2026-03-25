import { createPaginator } from "@smithy/core";
import { ListWorkteamsCommand, } from "../commands/ListWorkteamsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListWorkteams = createPaginator(SageMakerClient, ListWorkteamsCommand, "NextToken", "NextToken", "MaxResults");
