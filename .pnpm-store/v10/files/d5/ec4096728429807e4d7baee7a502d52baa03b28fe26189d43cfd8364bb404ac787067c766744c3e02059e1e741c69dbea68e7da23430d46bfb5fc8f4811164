import { createPaginator } from "@smithy/core";
import { ListEntityPersonasCommand, } from "../commands/ListEntityPersonasCommand";
import { KendraClient } from "../KendraClient";
export const paginateListEntityPersonas = createPaginator(KendraClient, ListEntityPersonasCommand, "NextToken", "NextToken", "MaxResults");
