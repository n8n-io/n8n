import { createPaginator } from "@smithy/core";
import { ListPipelineVersionsCommand, } from "../commands/ListPipelineVersionsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListPipelineVersions = createPaginator(SageMakerClient, ListPipelineVersionsCommand, "NextToken", "NextToken", "MaxResults");
