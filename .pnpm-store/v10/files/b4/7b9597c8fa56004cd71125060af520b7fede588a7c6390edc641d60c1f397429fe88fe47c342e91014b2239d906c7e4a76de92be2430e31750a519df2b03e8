import { createPaginator } from "@smithy/core";
import { QueryLineageCommand, } from "../commands/QueryLineageCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateQueryLineage = createPaginator(SageMakerClient, QueryLineageCommand, "NextToken", "NextToken", "MaxResults");
