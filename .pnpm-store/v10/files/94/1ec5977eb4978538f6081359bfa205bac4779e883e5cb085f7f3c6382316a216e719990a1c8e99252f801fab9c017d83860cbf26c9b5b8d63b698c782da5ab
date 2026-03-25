// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { parseKeyVaultIdentifier } from "../../keyvault-common/src";
/**
 * Parses the given Key Vault Secret Id. An example is:
 *
 *   https://<keyvault-name>.vault.azure.net/secrets/<secret-name>/<unique-version-id>
 *
 * On parsing the above Id, this function returns:
 *```ts
 *   {
 *      sourceId: "https://<keyvault-name>.vault.azure.net/secrets/<secret-name>/<unique-version-id>",
 *      vaultUrl: "https://<keyvault-name>.vault.azure.net",
 *      version: "<unique-version-id>",
 *      name: "<secret-name>"
 *   }
 *```
 * @param id - The Id of the Key Vault Secret.
 */
export function parseKeyVaultSecretIdentifier(id) {
    const urlParts = id.split("/");
    const collection = urlParts[3];
    return Object.assign({ sourceId: id }, parseKeyVaultIdentifier(collection, id));
}
//# sourceMappingURL=identifier.js.map