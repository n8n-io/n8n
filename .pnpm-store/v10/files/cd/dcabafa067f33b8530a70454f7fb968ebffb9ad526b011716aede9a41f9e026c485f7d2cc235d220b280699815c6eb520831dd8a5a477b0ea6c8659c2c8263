import { createPaginator } from "@smithy/core";
import { ListContactListsCommand, } from "../commands/ListContactListsCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateListContactLists = createPaginator(SESv2Client, ListContactListsCommand, "NextToken", "NextToken", "PageSize");
