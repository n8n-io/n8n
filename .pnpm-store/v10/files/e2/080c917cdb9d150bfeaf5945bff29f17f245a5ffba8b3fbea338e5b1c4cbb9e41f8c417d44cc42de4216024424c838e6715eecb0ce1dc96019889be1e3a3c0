import { createPaginator } from "@smithy/core";
import { ListImagesCommand } from "../commands/ListImagesCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListImages = createPaginator(SageMakerClient, ListImagesCommand, "NextToken", "NextToken", "MaxResults");
