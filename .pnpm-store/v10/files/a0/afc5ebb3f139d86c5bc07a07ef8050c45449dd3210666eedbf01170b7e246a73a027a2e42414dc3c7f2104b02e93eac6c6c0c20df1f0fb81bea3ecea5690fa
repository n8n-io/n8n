import { createPaginator } from "@smithy/core";
import { GetDedicatedIpsCommand, } from "../commands/GetDedicatedIpsCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateGetDedicatedIps = createPaginator(SESv2Client, GetDedicatedIpsCommand, "NextToken", "NextToken", "PageSize");
