import { createPaginator } from "@smithy/core";
import { ListDedicatedIpPoolsCommand, } from "../commands/ListDedicatedIpPoolsCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateListDedicatedIpPools = createPaginator(SESv2Client, ListDedicatedIpPoolsCommand, "NextToken", "NextToken", "PageSize");
