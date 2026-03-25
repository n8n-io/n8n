import { createPaginator } from "@smithy/core";
import { ListAliasesCommand } from "../commands/ListAliasesCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListAliases = createPaginator(SageMakerClient, ListAliasesCommand, "NextToken", "NextToken", "MaxResults");
