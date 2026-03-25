import { createPaginator } from "@smithy/core";
import { ListModelMetadataCommand, } from "../commands/ListModelMetadataCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListModelMetadata = createPaginator(SageMakerClient, ListModelMetadataCommand, "NextToken", "NextToken", "MaxResults");
