import { createPaginator } from "@smithy/core";
import { ListPipelineExecutionsCommand, } from "../commands/ListPipelineExecutionsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListPipelineExecutions = createPaginator(SageMakerClient, ListPipelineExecutionsCommand, "NextToken", "NextToken", "MaxResults");
