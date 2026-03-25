import { createPaginator } from "@smithy/core";
import { ListDataSourcesCommand, } from "../commands/ListDataSourcesCommand";
import { KendraClient } from "../KendraClient";
export const paginateListDataSources = createPaginator(KendraClient, ListDataSourcesCommand, "NextToken", "NextToken", "MaxResults");
