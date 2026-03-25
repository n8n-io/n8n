import { createPaginator } from "@smithy/core";
import { ListComputeQuotasCommand, } from "../commands/ListComputeQuotasCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListComputeQuotas = createPaginator(SageMakerClient, ListComputeQuotasCommand, "NextToken", "NextToken", "MaxResults");
