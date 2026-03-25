import { createPaginator } from "@smithy/core";
import { ListConfigurationSetsCommand, } from "../commands/ListConfigurationSetsCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateListConfigurationSets = createPaginator(SESv2Client, ListConfigurationSetsCommand, "NextToken", "NextToken", "PageSize");
