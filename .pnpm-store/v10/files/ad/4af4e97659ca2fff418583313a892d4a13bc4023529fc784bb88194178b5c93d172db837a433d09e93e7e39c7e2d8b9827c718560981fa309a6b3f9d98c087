import { createPaginator } from "@smithy/core";
import { ListInferenceComponentsCommand, } from "../commands/ListInferenceComponentsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListInferenceComponents = createPaginator(SageMakerClient, ListInferenceComponentsCommand, "NextToken", "NextToken", "MaxResults");
