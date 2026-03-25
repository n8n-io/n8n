import { createPaginator } from "@smithy/core";
import { ListQuerySuggestionsBlockListsCommand, } from "../commands/ListQuerySuggestionsBlockListsCommand";
import { KendraClient } from "../KendraClient";
export const paginateListQuerySuggestionsBlockLists = createPaginator(KendraClient, ListQuerySuggestionsBlockListsCommand, "NextToken", "NextToken", "MaxResults");
