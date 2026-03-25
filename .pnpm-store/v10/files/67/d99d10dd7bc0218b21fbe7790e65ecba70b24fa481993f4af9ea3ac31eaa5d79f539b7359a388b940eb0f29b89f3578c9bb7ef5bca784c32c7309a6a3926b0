import { createPaginator } from "@smithy/core";
import { ListHumanTaskUisCommand, } from "../commands/ListHumanTaskUisCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListHumanTaskUis = createPaginator(SageMakerClient, ListHumanTaskUisCommand, "NextToken", "NextToken", "MaxResults");
