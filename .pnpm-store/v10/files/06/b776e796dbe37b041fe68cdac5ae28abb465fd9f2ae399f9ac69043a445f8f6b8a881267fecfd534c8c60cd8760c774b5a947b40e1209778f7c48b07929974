import { createPaginator } from "@smithy/core";
import { ListPipelineParametersForExecutionCommand, } from "../commands/ListPipelineParametersForExecutionCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListPipelineParametersForExecution = createPaginator(SageMakerClient, ListPipelineParametersForExecutionCommand, "NextToken", "NextToken", "MaxResults");
