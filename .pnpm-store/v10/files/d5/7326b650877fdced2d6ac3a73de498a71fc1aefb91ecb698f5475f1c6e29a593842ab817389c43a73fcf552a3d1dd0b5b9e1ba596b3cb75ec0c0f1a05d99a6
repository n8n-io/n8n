import { createPaginator } from "@smithy/core";
import { ListDomainsCommand } from "../commands/ListDomainsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListDomains = createPaginator(SageMakerClient, ListDomainsCommand, "NextToken", "NextToken", "MaxResults");
