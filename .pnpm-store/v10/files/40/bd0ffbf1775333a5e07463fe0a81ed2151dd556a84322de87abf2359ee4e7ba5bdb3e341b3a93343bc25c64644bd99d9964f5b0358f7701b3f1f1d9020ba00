import { createPaginator } from "@smithy/core";
import { ListSecretVersionIdsCommand, } from "../commands/ListSecretVersionIdsCommand";
import { SecretsManagerClient } from "../SecretsManagerClient";
export const paginateListSecretVersionIds = createPaginator(SecretsManagerClient, ListSecretVersionIdsCommand, "NextToken", "NextToken", "MaxResults");
