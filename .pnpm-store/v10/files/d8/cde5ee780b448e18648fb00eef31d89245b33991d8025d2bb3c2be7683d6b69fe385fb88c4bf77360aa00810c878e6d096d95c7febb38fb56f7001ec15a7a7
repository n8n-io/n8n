import { createPaginator } from "@smithy/core";
import { ListTrialsCommand } from "../commands/ListTrialsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListTrials = createPaginator(SageMakerClient, ListTrialsCommand, "NextToken", "NextToken", "MaxResults");
