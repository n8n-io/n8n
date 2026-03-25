import { createPaginator } from "@smithy/core";
import { ListGroupsOlderThanOrderingIdCommand, } from "../commands/ListGroupsOlderThanOrderingIdCommand";
import { KendraClient } from "../KendraClient";
export const paginateListGroupsOlderThanOrderingId = createPaginator(KendraClient, ListGroupsOlderThanOrderingIdCommand, "NextToken", "NextToken", "MaxResults");
