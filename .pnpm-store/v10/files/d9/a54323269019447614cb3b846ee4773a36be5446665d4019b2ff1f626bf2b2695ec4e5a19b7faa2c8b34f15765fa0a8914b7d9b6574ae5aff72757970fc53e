import { createPaginator } from "@smithy/core";
import { ListCodeRepositoriesCommand, } from "../commands/ListCodeRepositoriesCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListCodeRepositories = createPaginator(SageMakerClient, ListCodeRepositoriesCommand, "NextToken", "NextToken", "MaxResults");
