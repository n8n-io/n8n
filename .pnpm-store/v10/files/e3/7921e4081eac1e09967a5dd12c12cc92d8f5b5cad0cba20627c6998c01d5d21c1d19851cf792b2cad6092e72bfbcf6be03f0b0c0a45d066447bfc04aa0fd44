// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { parseKeyVaultSecretIdentifier } from "./identifier";
/**
 * @internal
 * Shapes the exposed {@link KeyVaultKey} based on either a received secret bundle or deleted secret bundle.
 */
export function getSecretFromSecretBundle(bundle) {
    const secretBundle = bundle;
    const deletedSecretBundle = bundle;
    const parsedId = parseKeyVaultSecretIdentifier(secretBundle.id);
    const attributes = secretBundle.attributes;
    delete secretBundle.attributes;
    const resultObject = {
        value: secretBundle.value,
        name: parsedId.name,
        properties: {
            expiresOn: attributes === null || attributes === void 0 ? void 0 : attributes.expires,
            createdOn: attributes === null || attributes === void 0 ? void 0 : attributes.created,
            updatedOn: attributes === null || attributes === void 0 ? void 0 : attributes.updated,
            enabled: attributes === null || attributes === void 0 ? void 0 : attributes.enabled,
            notBefore: attributes === null || attributes === void 0 ? void 0 : attributes.notBefore,
            recoverableDays: attributes === null || attributes === void 0 ? void 0 : attributes.recoverableDays,
            recoveryLevel: attributes === null || attributes === void 0 ? void 0 : attributes.recoveryLevel,
            id: secretBundle.id,
            contentType: secretBundle.contentType,
            tags: secretBundle.tags,
            managed: secretBundle.managed,
            vaultUrl: parsedId.vaultUrl,
            version: parsedId.version,
            name: parsedId.name,
            certificateKeyId: secretBundle.kid,
        },
    };
    if (deletedSecretBundle.recoveryId) {
        resultObject.properties.recoveryId = deletedSecretBundle.recoveryId;
        resultObject.properties.scheduledPurgeDate = deletedSecretBundle.scheduledPurgeDate;
        resultObject.properties.deletedOn = deletedSecretBundle.deletedDate;
        resultObject.recoveryId = deletedSecretBundle.recoveryId;
        resultObject.scheduledPurgeDate = deletedSecretBundle.scheduledPurgeDate;
        resultObject.deletedOn = deletedSecretBundle.deletedDate;
    }
    if (attributes) {
        if (attributes.vaultUrl) {
            delete resultObject.properties.vaultUrl;
        }
        if (attributes.expires) {
            delete resultObject.properties.expires;
        }
        if (attributes.created) {
            delete resultObject.properties.created;
        }
        if (attributes.updated) {
            delete resultObject.properties.updated;
        }
    }
    return resultObject;
}
//# sourceMappingURL=transformations.js.map