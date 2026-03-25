import { createPaginator } from "@smithy/core";
import { ListThesauriCommand, } from "../commands/ListThesauriCommand";
import { KendraClient } from "../KendraClient";
export const paginateListThesauri = createPaginator(KendraClient, ListThesauriCommand, "NextToken", "NextToken", "MaxResults");
