import { createPaginator } from "@smithy/core";
import { ListInferenceExperimentsCommand, } from "../commands/ListInferenceExperimentsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListInferenceExperiments = createPaginator(SageMakerClient, ListInferenceExperimentsCommand, "NextToken", "NextToken", "MaxResults");
