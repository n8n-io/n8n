import { createPaginator } from "@smithy/core";
import { ListExportJobsCommand, } from "../commands/ListExportJobsCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateListExportJobs = createPaginator(SESv2Client, ListExportJobsCommand, "NextToken", "NextToken", "PageSize");
