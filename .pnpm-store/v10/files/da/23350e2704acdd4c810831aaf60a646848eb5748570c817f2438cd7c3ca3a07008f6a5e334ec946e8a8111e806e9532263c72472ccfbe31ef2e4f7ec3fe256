import { createPaginator } from "@smithy/core";
import { ListNotebookInstancesCommand, } from "../commands/ListNotebookInstancesCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListNotebookInstances = createPaginator(SageMakerClient, ListNotebookInstancesCommand, "NextToken", "NextToken", "MaxResults");
