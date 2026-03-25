import { createPaginator } from "@smithy/core";
import { ListAssociationsCommand, } from "../commands/ListAssociationsCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListAssociations = createPaginator(SageMakerClient, ListAssociationsCommand, "NextToken", "NextToken", "MaxResults");
