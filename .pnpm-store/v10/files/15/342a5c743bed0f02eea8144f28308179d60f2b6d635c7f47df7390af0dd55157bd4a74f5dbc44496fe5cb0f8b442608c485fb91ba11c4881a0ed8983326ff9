// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { parseKeyvaultIdentifier } from "../../keyvault-common/src";
/**
 * Parses the given Key Vault Key Id. An example is:
 *
 *   https://<keyvault-name>.vault.azure.net/keys/<key-name>/<unique-version-id>
 *
 * On parsing the above Id, this function returns:
 *```ts
 *   {
 *      sourceId: "https://<keyvault-name>.vault.azure.net/keys/<key-name>/<unique-version-id>",
 *      vaultUrl: "https://<keyvault-name>.vault.azure.net",
 *      version: "<unique-version-id>",
 *      name: "<key-name>"
 *   }
 *```
 * @param id - The Id of the Key Vault Key.
 */
export function parseKeyVaultKeyIdentifier(id) {
    const urlParts = id.split("/");
    const collection = urlParts[3];
    return Object.assign({ sourceId: id }, parseKeyvaultIdentifier(collection, id));
}
//# sourceMappingURL=identifier.js.map