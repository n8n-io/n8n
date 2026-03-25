import { createPaginator } from "@smithy/core";
import { ListSecretsCommand } from "../commands/ListSecretsCommand";
import { SecretsManagerClient } from "../SecretsManagerClient";
export const paginateListSecrets = createPaginator(SecretsManagerClient, ListSecretsCommand, "NextToken", "NextToken", "MaxResults");
