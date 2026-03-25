import { createPaginator } from "@smithy/core";
import { ListWorkforcesCommand, } from "../commands/ListWorkforcesCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListWorkforces = createPaginator(SageMakerClient, ListWorkforcesCommand, "NextToken", "NextToken", "MaxResults");
