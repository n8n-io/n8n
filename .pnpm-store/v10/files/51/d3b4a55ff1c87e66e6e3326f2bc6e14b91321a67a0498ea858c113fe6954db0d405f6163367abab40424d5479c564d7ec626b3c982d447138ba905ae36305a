import { createPaginator } from "@smithy/core";
import { ListIndicesCommand } from "../commands/ListIndicesCommand";
import { KendraClient } from "../KendraClient";
export const paginateListIndices = createPaginator(KendraClient, ListIndicesCommand, "NextToken", "NextToken", "MaxResults");
