import { createPaginator } from "@smithy/core";
import { ListSpacesCommand } from "../commands/ListSpacesCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListSpaces = createPaginator(SageMakerClient, ListSpacesCommand, "NextToken", "NextToken", "MaxResults");
