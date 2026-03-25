import { createPaginator } from "@smithy/core";
import { ListProjectsCommand, } from "../commands/ListProjectsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListProjects = createPaginator(SageMakerClient, ListProjectsCommand, "NextToken", "NextToken", "MaxResults");
