import { createPaginator } from "@smithy/core";
import { ListExperimentsCommand, } from "../commands/ListExperimentsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListExperiments = createPaginator(SageMakerClient, ListExperimentsCommand, "NextToken", "NextToken", "MaxResults");
