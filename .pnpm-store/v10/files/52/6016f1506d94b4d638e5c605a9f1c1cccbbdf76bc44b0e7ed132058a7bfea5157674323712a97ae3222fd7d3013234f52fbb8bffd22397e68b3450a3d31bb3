// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { __asyncGenerator, __asyncValues, __await } from "tslib";
import { parseKeyVaultKeyIdentifier } from "./identifier.js";
/**
 * @internal
 * Shapes the exposed {@link KeyVaultKey} based on either a received key bundle or deleted key bundle.
 */
export function getKeyFromKeyBundle(bundle) {
    const keyBundle = bundle;
    const deletedKeyBundle = bundle;
    const parsedId = parseKeyVaultKeyIdentifier(keyBundle.key.kid);
    const attributes = keyBundle.attributes || {};
    const resultObject = {
        key: keyBundle.key,
        id: keyBundle.key ? keyBundle.key.kid : undefined,
        name: parsedId.name,
        keyOperations: keyBundle.key ? keyBundle.key.keyOps : undefined,
        keyType: keyBundle.key ? keyBundle.key.kty : undefined,
        properties: {
            tags: keyBundle.tags,
            enabled: attributes.enabled,
            notBefore: attributes.notBefore,
            expiresOn: attributes.expires,
            createdOn: attributes.created,
            updatedOn: attributes.updated,
            recoverableDays: attributes.recoverableDays,
            recoveryLevel: attributes.recoveryLevel,
            exportable: attributes.exportable,
            releasePolicy: keyBundle.releasePolicy,
            hsmPlatform: attributes.hsmPlatform,
            vaultUrl: parsedId.vaultUrl,
            version: parsedId.version,
            name: parsedId.name,
            managed: keyBundle.managed,
            id: keyBundle.key ? keyBundle.key.kid : undefined,
        },
    };
    if (deletedKeyBundle.recoveryId) {
        resultObject.properties.recoveryId = deletedKeyBundle.recoveryId;
        resultObject.properties.scheduledPurgeDate = deletedKeyBundle.scheduledPurgeDate;
        resultObject.properties.deletedOn = deletedKeyBundle.deletedDate;
    }
    if (attributes.attestation) {
        resultObject.properties.attestation = attributes.attestation;
    }
    return resultObject;
}
/**
 * @internal
 * Shapes the exposed {@link DeletedKey} based on a received KeyItem.
 */
export function getDeletedKeyFromDeletedKeyItem(keyItem) {
    const commonProperties = getKeyPropertiesFromKeyItem(keyItem);
    return {
        key: {
            kid: keyItem.kid,
        },
        id: keyItem.kid,
        name: commonProperties.name,
        properties: Object.assign(Object.assign({}, commonProperties), { recoveryId: keyItem.recoveryId, scheduledPurgeDate: keyItem.scheduledPurgeDate, deletedOn: keyItem.deletedDate }),
    };
}
/**
 * @internal
 * Shapes the exposed {@link KeyProperties} based on a received KeyItem.
 */
export function getKeyPropertiesFromKeyItem(keyItem) {
    const parsedId = parseKeyVaultKeyIdentifier(keyItem.kid);
    const attributes = keyItem.attributes || {};
    const resultObject = {
        createdOn: attributes.created,
        enabled: attributes === null || attributes === void 0 ? void 0 : attributes.enabled,
        expiresOn: attributes === null || attributes === void 0 ? void 0 : attributes.expires,
        id: keyItem.kid,
        managed: keyItem.managed,
        name: parsedId.name,
        notBefore: attributes === null || attributes === void 0 ? void 0 : attributes.notBefore,
        recoverableDays: attributes === null || attributes === void 0 ? void 0 : attributes.recoverableDays,
        recoveryLevel: attributes === null || attributes === void 0 ? void 0 : attributes.recoveryLevel,
        hsmPlatform: attributes === null || attributes === void 0 ? void 0 : attributes.hsmPlatform,
        tags: keyItem.tags,
        updatedOn: attributes.updated,
        vaultUrl: parsedId.vaultUrl,
        version: parsedId.version,
    };
    return resultObject;
}
const actionTypeCaseInsensitiveMapping = {
    rotate: "Rotate",
    notify: "Notify",
};
function getNormalizedActionType(caseInsensitiveActionType) {
    const result = actionTypeCaseInsensitiveMapping[caseInsensitiveActionType.toLowerCase()];
    if (result) {
        return result;
    }
    throw new Error(`Unrecognized action type: ${caseInsensitiveActionType}`);
}
/**
 * @internal
 */
export const keyRotationTransformations = {
    propertiesToGenerated: function (parameters) {
        var _a;
        const policy = {
            attributes: {
                expiryTime: parameters.expiresIn,
            },
            lifetimeActions: (_a = parameters.lifetimeActions) === null || _a === void 0 ? void 0 : _a.map((action) => {
                const generatedAction = {
                    action: { type: action.action },
                    trigger: {},
                };
                if (action.timeAfterCreate) {
                    generatedAction.trigger.timeAfterCreate = action.timeAfterCreate;
                }
                if (action.timeBeforeExpiry) {
                    generatedAction.trigger.timeBeforeExpiry = action.timeBeforeExpiry;
                }
                return generatedAction;
            }),
        };
        return policy;
    },
    generatedToPublic(generated) {
        var _a, _b, _c, _d;
        const policy = {
            id: generated.id,
            createdOn: (_a = generated.attributes) === null || _a === void 0 ? void 0 : _a.created,
            updatedOn: (_b = generated.attributes) === null || _b === void 0 ? void 0 : _b.updated,
            expiresIn: (_c = generated.attributes) === null || _c === void 0 ? void 0 : _c.expiryTime,
            lifetimeActions: (_d = generated.lifetimeActions) === null || _d === void 0 ? void 0 : _d.map((action) => {
                var _a, _b;
                return {
                    action: getNormalizedActionType(action.action.type),
                    timeAfterCreate: (_a = action.trigger) === null || _a === void 0 ? void 0 : _a.timeAfterCreate,
                    timeBeforeExpiry: (_b = action.trigger) === null || _b === void 0 ? void 0 : _b.timeBeforeExpiry,
                };
            }),
        };
        return policy;
    },
};
/**
 * A helper supporting compatibility between modular and legacy paged async iterables.
 *
 * Provides the following compatibility:
 * 1. Maps the values of the paged async iterable using the provided mapper function.
 * 2. Supports `maxPageSize` operation on the paged async iterable.
 *
 * TODO: move this to keyvault-common once everything is merged
 */
export function mapPagedAsyncIterable(options, operation, mapper) {
    let iter = undefined;
    return {
        async next() {
            iter !== null && iter !== void 0 ? iter : (iter = operation(Object.assign(Object.assign({}, options), { maxresults: undefined })));
            const result = await iter.next();
            return Object.assign(Object.assign({}, result), { value: result.value && mapper(result.value) });
        },
        [Symbol.asyncIterator]() {
            return this;
        },
        byPage(settings) {
            return __asyncGenerator(this, arguments, function* byPage_1() {
                var _a, e_1, _b, _c;
                // Pass the maxPageSize value to the underlying page operation
                const iteratorByPage = operation(Object.assign(Object.assign({}, options), { maxresults: settings === null || settings === void 0 ? void 0 : settings.maxPageSize })).byPage(settings);
                try {
                    for (var _d = true, iteratorByPage_1 = __asyncValues(iteratorByPage), iteratorByPage_1_1; iteratorByPage_1_1 = yield __await(iteratorByPage_1.next()), _a = iteratorByPage_1_1.done, !_a; _d = true) {
                        _c = iteratorByPage_1_1.value;
                        _d = false;
                        const page = _c;
                        yield yield __await(page.map(mapper));
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_d && !_a && (_b = iteratorByPage_1.return)) yield __await(_b.call(iteratorByPage_1));
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            });
        },
    };
}
//# sourceMappingURL=transformations.js.map