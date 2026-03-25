import { createPaginator } from "@smithy/core";
import { ListContactsCommand, } from "../commands/ListContactsCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateListContacts = createPaginator(SESv2Client, ListContactsCommand, "NextToken", "NextToken", "PageSize");
