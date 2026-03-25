import { createPaginator } from "@smithy/core";
import { ListDataSourceSyncJobsCommand, } from "../commands/ListDataSourceSyncJobsCommand";
import { KendraClient } from "../KendraClient";
export const paginateListDataSourceSyncJobs = createPaginator(KendraClient, ListDataSourceSyncJobsCommand, "NextToken", "NextToken", "MaxResults");
