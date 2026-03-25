import { createPaginator } from "@smithy/core";
import { ListReputationEntitiesCommand, } from "../commands/ListReputationEntitiesCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateListReputationEntities = createPaginator(SESv2Client, ListReputationEntitiesCommand, "NextToken", "NextToken", "PageSize");
