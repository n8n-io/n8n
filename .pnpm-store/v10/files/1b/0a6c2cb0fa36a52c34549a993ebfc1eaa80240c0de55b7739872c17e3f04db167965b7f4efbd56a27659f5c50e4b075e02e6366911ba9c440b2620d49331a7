import { createPaginator } from "@smithy/core";
import { BatchGetSecretValueCommand, } from "../commands/BatchGetSecretValueCommand";
import { SecretsManagerClient } from "../SecretsManagerClient";
export const paginateBatchGetSecretValue = createPaginator(SecretsManagerClient, BatchGetSecretValueCommand, "NextToken", "NextToken", "MaxResults");
