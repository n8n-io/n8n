import { createPaginator } from "@smithy/core";
import { SearchCommand } from "../commands/SearchCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateSearch = createPaginator(SageMakerClient, SearchCommand, "NextToken", "NextToken", "MaxResults");
