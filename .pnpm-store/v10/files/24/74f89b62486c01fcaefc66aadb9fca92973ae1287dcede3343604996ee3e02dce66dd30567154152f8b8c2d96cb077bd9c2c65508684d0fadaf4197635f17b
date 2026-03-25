import { createPaginator } from "@smithy/core";
import { ListTenantResourcesCommand, } from "../commands/ListTenantResourcesCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateListTenantResources = createPaginator(SESv2Client, ListTenantResourcesCommand, "NextToken", "NextToken", "PageSize");
