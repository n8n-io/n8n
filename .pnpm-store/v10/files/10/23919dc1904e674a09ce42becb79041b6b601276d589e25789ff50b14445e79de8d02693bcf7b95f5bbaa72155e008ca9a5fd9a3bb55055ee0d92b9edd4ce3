import { createPaginator } from "@smithy/core";
import { ListPipelineExecutionStepsCommand, } from "../commands/ListPipelineExecutionStepsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListPipelineExecutionSteps = createPaginator(SageMakerClient, ListPipelineExecutionStepsCommand, "NextToken", "NextToken", "MaxResults");
