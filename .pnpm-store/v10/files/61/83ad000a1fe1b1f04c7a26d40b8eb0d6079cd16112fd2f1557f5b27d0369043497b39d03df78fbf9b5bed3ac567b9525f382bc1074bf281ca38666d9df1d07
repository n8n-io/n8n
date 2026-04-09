"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseKeyVaultKeyIdentifier = parseKeyVaultKeyIdentifier;
const keyvault_common_1 = require("@azure/keyvault-common");
/**
 * Parses the given Key Vault Key Id. An example is:
 *
 *   https://<keyvault-name>.vault.azure.net/keys/<key-name>/<unique-version-id>
 *
 * On parsing the above Id, this function returns:
 *```ts snippet:ignore
 *   {
 *      sourceId: "https://<keyvault-name>.vault.azure.net/keys/<key-name>/<unique-version-id>",
 *      vaultUrl: "https://<keyvault-name>.vault.azure.net",
 *      version: "<unique-version-id>",
 *      name: "<key-name>"
 *   }
 *```
 * @param id - The Id of the Key Vault Key.
 */
function parseKeyVaultKeyIdentifier(id) {
    const urlParts = id.split("/");
    const collection = urlParts[3];
    return Object.assign({ sourceId: id }, (0, keyvault_common_1.parseKeyVaultIdentifier)(collection, id));
}
//# sourceMappingURL=identifier.js.map