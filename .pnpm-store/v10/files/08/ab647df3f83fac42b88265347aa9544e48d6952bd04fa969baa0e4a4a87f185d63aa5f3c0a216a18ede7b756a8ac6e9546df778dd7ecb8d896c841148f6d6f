import { createPaginator } from "@smithy/core";
import { ListResourceTenantsCommand, } from "../commands/ListResourceTenantsCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateListResourceTenants = createPaginator(SESv2Client, ListResourceTenantsCommand, "NextToken", "NextToken", "PageSize");
