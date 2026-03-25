import { createPaginator } from "@smithy/core";
import { ListMultiRegionEndpointsCommand, } from "../commands/ListMultiRegionEndpointsCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateListMultiRegionEndpoints = createPaginator(SESv2Client, ListMultiRegionEndpointsCommand, "NextToken", "NextToken", "PageSize");
