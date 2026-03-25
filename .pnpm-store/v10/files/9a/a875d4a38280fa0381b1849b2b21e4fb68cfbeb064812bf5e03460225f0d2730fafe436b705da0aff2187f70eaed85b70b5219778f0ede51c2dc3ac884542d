import { createPaginator } from "@smithy/core";
import { ListAccessControlConfigurationsCommand, } from "../commands/ListAccessControlConfigurationsCommand";
import { KendraClient } from "../KendraClient";
export const paginateListAccessControlConfigurations = createPaginator(KendraClient, ListAccessControlConfigurationsCommand, "NextToken", "NextToken", "MaxResults");
