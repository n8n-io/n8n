import { createPaginator } from "@smithy/core";
import { ListEmailIdentitiesCommand, } from "../commands/ListEmailIdentitiesCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateListEmailIdentities = createPaginator(SESv2Client, ListEmailIdentitiesCommand, "NextToken", "NextToken", "PageSize");
