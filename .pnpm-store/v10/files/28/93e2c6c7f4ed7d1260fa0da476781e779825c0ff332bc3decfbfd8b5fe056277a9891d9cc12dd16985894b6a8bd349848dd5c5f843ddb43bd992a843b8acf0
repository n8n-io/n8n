import { createPaginator } from "@smithy/core";
import { ListArtifactsCommand, } from "../commands/ListArtifactsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListArtifacts = createPaginator(SageMakerClient, ListArtifactsCommand, "NextToken", "NextToken", "MaxResults");
