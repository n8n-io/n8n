import { createPaginator } from "@smithy/core";
import { ListDeliverabilityTestReportsCommand, } from "../commands/ListDeliverabilityTestReportsCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateListDeliverabilityTestReports = createPaginator(SESv2Client, ListDeliverabilityTestReportsCommand, "NextToken", "NextToken", "PageSize");
