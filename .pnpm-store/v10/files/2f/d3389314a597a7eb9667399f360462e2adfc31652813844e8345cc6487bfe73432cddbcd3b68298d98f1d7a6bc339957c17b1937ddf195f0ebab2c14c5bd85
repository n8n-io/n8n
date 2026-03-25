import { createPaginator } from "@smithy/core";
import { ListTenantsCommand } from "../commands/ListTenantsCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateListTenants = createPaginator(SESv2Client, ListTenantsCommand, "NextToken", "NextToken", "PageSize");
