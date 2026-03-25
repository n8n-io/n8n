import { createPaginator } from "@smithy/core";
import { ListImportJobsCommand, } from "../commands/ListImportJobsCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateListImportJobs = createPaginator(SESv2Client, ListImportJobsCommand, "NextToken", "NextToken", "PageSize");
