import { createPaginator } from "@smithy/core";
import { ListSuppressedDestinationsCommand, } from "../commands/ListSuppressedDestinationsCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateListSuppressedDestinations = createPaginator(SESv2Client, ListSuppressedDestinationsCommand, "NextToken", "NextToken", "PageSize");
