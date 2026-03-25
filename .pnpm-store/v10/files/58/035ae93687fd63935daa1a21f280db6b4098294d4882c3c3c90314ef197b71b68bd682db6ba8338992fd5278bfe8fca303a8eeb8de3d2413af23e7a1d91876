import { createPaginator } from "@smithy/core";
import { ListFaqsCommand } from "../commands/ListFaqsCommand";
import { KendraClient } from "../KendraClient";
export const paginateListFaqs = createPaginator(KendraClient, ListFaqsCommand, "NextToken", "NextToken", "MaxResults");
