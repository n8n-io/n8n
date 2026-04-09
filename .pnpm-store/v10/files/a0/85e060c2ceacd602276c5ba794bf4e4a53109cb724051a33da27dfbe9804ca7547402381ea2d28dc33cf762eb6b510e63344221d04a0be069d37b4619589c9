"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports._getKeyAttestationSend = _getKeyAttestationSend;
exports._getKeyAttestationDeserialize = _getKeyAttestationDeserialize;
exports.getKeyAttestation = getKeyAttestation;
exports._getRandomBytesSend = _getRandomBytesSend;
exports._getRandomBytesDeserialize = _getRandomBytesDeserialize;
exports.getRandomBytes = getRandomBytes;
exports._updateKeyRotationPolicySend = _updateKeyRotationPolicySend;
exports._updateKeyRotationPolicyDeserialize = _updateKeyRotationPolicyDeserialize;
exports.updateKeyRotationPolicy = updateKeyRotationPolicy;
exports._getKeyRotationPolicySend = _getKeyRotationPolicySend;
exports._getKeyRotationPolicyDeserialize = _getKeyRotationPolicyDeserialize;
exports.getKeyRotationPolicy = getKeyRotationPolicy;
exports._recoverDeletedKeySend = _recoverDeletedKeySend;
exports._recoverDeletedKeyDeserialize = _recoverDeletedKeyDeserialize;
exports.recoverDeletedKey = recoverDeletedKey;
exports._purgeDeletedKeySend = _purgeDeletedKeySend;
exports._purgeDeletedKeyDeserialize = _purgeDeletedKeyDeserialize;
exports.purgeDeletedKey = purgeDeletedKey;
exports._getDeletedKeySend = _getDeletedKeySend;
exports._getDeletedKeyDeserialize = _getDeletedKeyDeserialize;
exports.getDeletedKey = getDeletedKey;
exports._getDeletedKeysSend = _getDeletedKeysSend;
exports._getDeletedKeysDeserialize = _getDeletedKeysDeserialize;
exports.getDeletedKeys = getDeletedKeys;
exports._releaseSend = _releaseSend;
exports._releaseDeserialize = _releaseDeserialize;
exports.release = release;
exports._unwrapKeySend = _unwrapKeySend;
exports._unwrapKeyDeserialize = _unwrapKeyDeserialize;
exports.unwrapKey = unwrapKey;
exports._wrapKeySend = _wrapKeySend;
exports._wrapKeyDeserialize = _wrapKeyDeserialize;
exports.wrapKey = wrapKey;
exports._verifySend = _verifySend;
exports._verifyDeserialize = _verifyDeserialize;
exports.verify = verify;
exports._signSend = _signSend;
exports._signDeserialize = _signDeserialize;
exports.sign = sign;
exports._decryptSend = _decryptSend;
exports._decryptDeserialize = _decryptDeserialize;
exports.decrypt = decrypt;
exports._encryptSend = _encryptSend;
exports._encryptDeserialize = _encryptDeserialize;
exports.encrypt = encrypt;
exports._restoreKeySend = _restoreKeySend;
exports._restoreKeyDeserialize = _restoreKeyDeserialize;
exports.restoreKey = restoreKey;
exports._backupKeySend = _backupKeySend;
exports._backupKeyDeserialize = _backupKeyDeserialize;
exports.backupKey = backupKey;
exports._getKeysSend = _getKeysSend;
exports._getKeysDeserialize = _getKeysDeserialize;
exports.getKeys = getKeys;
exports._getKeyVersionsSend = _getKeyVersionsSend;
exports._getKeyVersionsDeserialize = _getKeyVersionsDeserialize;
exports.getKeyVersions = getKeyVersions;
exports._getKeySend = _getKeySend;
exports._getKeyDeserialize = _getKeyDeserialize;
exports.getKey = getKey;
exports._updateKeySend = _updateKeySend;
exports._updateKeyDeserialize = _updateKeyDeserialize;
exports.updateKey = updateKey;
exports._deleteKeySend = _deleteKeySend;
exports._deleteKeyDeserialize = _deleteKeyDeserialize;
exports.deleteKey = deleteKey;
exports._importKeySend = _importKeySend;
exports._importKeyDeserialize = _importKeyDeserialize;
exports.importKey = importKey;
exports._rotateKeySend = _rotateKeySend;
exports._rotateKeyDeserialize = _rotateKeyDeserialize;
exports.rotateKey = rotateKey;
exports._createKeySend = _createKeySend;
exports._createKeyDeserialize = _createKeyDeserialize;
exports.createKey = createKey;
const models_js_1 = require("../models/models.js");
const pagingHelpers_js_1 = require("../static-helpers/pagingHelpers.js");
const urlTemplate_js_1 = require("../static-helpers/urlTemplate.js");
const core_client_1 = require("@azure-rest/core-client");
function _getKeyAttestationSend(context, keyName, keyVersion, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/{key-name}/{key-version}/attestation{?api%2Dversion}", {
        "key-name": keyName,
        "key-version": keyVersion,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .get(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers) }));
}
async function _getKeyAttestationDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.keyBundleDeserializer)(result.body);
}
/** The get key attestation operation returns the key along with its attestation blob. This operation requires the keys/get permission. */
async function getKeyAttestation(context, keyName, keyVersion, options = { requestOptions: {} }) {
    const result = await _getKeyAttestationSend(context, keyName, keyVersion, options);
    return _getKeyAttestationDeserialize(result);
}
function _getRandomBytesSend(context, parameters, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/rng{?api%2Dversion}", {
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .post(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { contentType: "application/json", headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers), body: (0, models_js_1.getRandomBytesRequestSerializer)(parameters) }));
}
async function _getRandomBytesDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.randomBytesDeserializer)(result.body);
}
/** Get the requested number of bytes containing random values from a managed HSM. */
async function getRandomBytes(context, parameters, options = { requestOptions: {} }) {
    const result = await _getRandomBytesSend(context, parameters, options);
    return _getRandomBytesDeserialize(result);
}
function _updateKeyRotationPolicySend(context, keyName, keyRotationPolicy, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/{key-name}/rotationpolicy{?api%2Dversion}", {
        "key-name": keyName,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .put(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { contentType: "application/json", headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers), body: (0, models_js_1.keyRotationPolicySerializer)(keyRotationPolicy) }));
}
async function _updateKeyRotationPolicyDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.keyRotationPolicyDeserializer)(result.body);
}
/** Set specified members in the key policy. Leave others as undefined. This operation requires the keys/update permission. */
async function updateKeyRotationPolicy(context, keyName, keyRotationPolicy, options = { requestOptions: {} }) {
    const result = await _updateKeyRotationPolicySend(context, keyName, keyRotationPolicy, options);
    return _updateKeyRotationPolicyDeserialize(result);
}
function _getKeyRotationPolicySend(context, keyName, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/{key-name}/rotationpolicy{?api%2Dversion}", {
        "key-name": keyName,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .get(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers) }));
}
async function _getKeyRotationPolicyDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.keyRotationPolicyDeserializer)(result.body);
}
/** The GetKeyRotationPolicy operation returns the specified key policy resources in the specified key vault. This operation requires the keys/get permission. */
async function getKeyRotationPolicy(context, keyName, options = { requestOptions: {} }) {
    const result = await _getKeyRotationPolicySend(context, keyName, options);
    return _getKeyRotationPolicyDeserialize(result);
}
function _recoverDeletedKeySend(context, keyName, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/deletedkeys/{key-name}/recover{?api%2Dversion}", {
        "key-name": keyName,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .post(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers) }));
}
async function _recoverDeletedKeyDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.keyBundleDeserializer)(result.body);
}
/** The Recover Deleted Key operation is applicable for deleted keys in soft-delete enabled vaults. It recovers the deleted key back to its latest version under /keys. An attempt to recover an non-deleted key will return an error. Consider this the inverse of the delete operation on soft-delete enabled vaults. This operation requires the keys/recover permission. */
async function recoverDeletedKey(context, keyName, options = { requestOptions: {} }) {
    const result = await _recoverDeletedKeySend(context, keyName, options);
    return _recoverDeletedKeyDeserialize(result);
}
function _purgeDeletedKeySend(context, keyName, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/deletedkeys/{key-name}{?api%2Dversion}", {
        "key-name": keyName,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .delete(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers) }));
}
async function _purgeDeletedKeyDeserialize(result) {
    const expectedStatuses = ["204"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return;
}
/** The Purge Deleted Key operation is applicable for soft-delete enabled vaults. While the operation can be invoked on any vault, it will return an error if invoked on a non soft-delete enabled vault. This operation requires the keys/purge permission. */
async function purgeDeletedKey(context, keyName, options = { requestOptions: {} }) {
    const result = await _purgeDeletedKeySend(context, keyName, options);
    return _purgeDeletedKeyDeserialize(result);
}
function _getDeletedKeySend(context, keyName, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/deletedkeys/{key-name}{?api%2Dversion}", {
        "key-name": keyName,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .get(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers) }));
}
async function _getDeletedKeyDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.deletedKeyBundleDeserializer)(result.body);
}
/** The Get Deleted Key operation is applicable for soft-delete enabled vaults. While the operation can be invoked on any vault, it will return an error if invoked on a non soft-delete enabled vault. This operation requires the keys/get permission. */
async function getDeletedKey(context, keyName, options = { requestOptions: {} }) {
    const result = await _getDeletedKeySend(context, keyName, options);
    return _getDeletedKeyDeserialize(result);
}
function _getDeletedKeysSend(context, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/deletedkeys{?api%2Dversion,maxresults}", {
        "api%2Dversion": context.apiVersion,
        maxresults: options === null || options === void 0 ? void 0 : options.maxresults,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .get(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers) }));
}
async function _getDeletedKeysDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1._deletedKeyListResultDeserializer)(result.body);
}
/** Retrieves a list of the keys in the Key Vault as JSON Web Key structures that contain the public part of a deleted key. This operation includes deletion-specific information. The Get Deleted Keys operation is applicable for vaults enabled for soft-delete. While the operation can be invoked on any vault, it will return an error if invoked on a non soft-delete enabled vault. This operation requires the keys/list permission. */
function getDeletedKeys(context, options = { requestOptions: {} }) {
    return (0, pagingHelpers_js_1.buildPagedAsyncIterator)(context, () => _getDeletedKeysSend(context, options), _getDeletedKeysDeserialize, ["200"], { itemName: "value", nextLinkName: "nextLink" });
}
function _releaseSend(context, keyName, keyVersion, parameters, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/{key-name}/{key-version}/release{?api%2Dversion}", {
        "key-name": keyName,
        "key-version": keyVersion,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .post(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { contentType: "application/json", headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers), body: (0, models_js_1.keyReleaseParametersSerializer)(parameters) }));
}
async function _releaseDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.keyReleaseResultDeserializer)(result.body);
}
/** The release key operation is applicable to all key types. The target key must be marked exportable. This operation requires the keys/release permission. */
async function release(context, keyName, keyVersion, parameters, options = { requestOptions: {} }) {
    const result = await _releaseSend(context, keyName, keyVersion, parameters, options);
    return _releaseDeserialize(result);
}
function _unwrapKeySend(context, keyName, keyVersion, parameters, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/{key-name}/{key-version}/unwrapkey{?api%2Dversion}", {
        "key-name": keyName,
        "key-version": keyVersion,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .post(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { contentType: "application/json", headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers), body: (0, models_js_1.keyOperationsParametersSerializer)(parameters) }));
}
async function _unwrapKeyDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.keyOperationResultDeserializer)(result.body);
}
/** The UNWRAP operation supports decryption of a symmetric key using the target key encryption key. This operation is the reverse of the WRAP operation. The UNWRAP operation applies to asymmetric and symmetric keys stored in Azure Key Vault since it uses the private portion of the key. This operation requires the keys/unwrapKey permission. */
async function unwrapKey(context, keyName, keyVersion, parameters, options = { requestOptions: {} }) {
    const result = await _unwrapKeySend(context, keyName, keyVersion, parameters, options);
    return _unwrapKeyDeserialize(result);
}
function _wrapKeySend(context, keyName, keyVersion, parameters, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/{key-name}/{key-version}/wrapkey{?api%2Dversion}", {
        "key-name": keyName,
        "key-version": keyVersion,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .post(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { contentType: "application/json", headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers), body: (0, models_js_1.keyOperationsParametersSerializer)(parameters) }));
}
async function _wrapKeyDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.keyOperationResultDeserializer)(result.body);
}
/** The WRAP operation supports encryption of a symmetric key using a key encryption key that has previously been stored in an Azure Key Vault. The WRAP operation is only strictly necessary for symmetric keys stored in Azure Key Vault since protection with an asymmetric key can be performed using the public portion of the key. This operation is supported for asymmetric keys as a convenience for callers that have a key-reference but do not have access to the public key material. This operation requires the keys/wrapKey permission. */
async function wrapKey(context, keyName, keyVersion, parameters, options = { requestOptions: {} }) {
    const result = await _wrapKeySend(context, keyName, keyVersion, parameters, options);
    return _wrapKeyDeserialize(result);
}
function _verifySend(context, keyName, keyVersion, parameters, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/{key-name}/{key-version}/verify{?api%2Dversion}", {
        "key-name": keyName,
        "key-version": keyVersion,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .post(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { contentType: "application/json", headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers), body: (0, models_js_1.keyVerifyParametersSerializer)(parameters) }));
}
async function _verifyDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.keyVerifyResultDeserializer)(result.body);
}
/** The VERIFY operation is applicable to symmetric keys stored in Azure Key Vault. VERIFY is not strictly necessary for asymmetric keys stored in Azure Key Vault since signature verification can be performed using the public portion of the key but this operation is supported as a convenience for callers that only have a key-reference and not the public portion of the key. This operation requires the keys/verify permission. */
async function verify(context, keyName, keyVersion, parameters, options = { requestOptions: {} }) {
    const result = await _verifySend(context, keyName, keyVersion, parameters, options);
    return _verifyDeserialize(result);
}
function _signSend(context, keyName, keyVersion, parameters, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/{key-name}/{key-version}/sign{?api%2Dversion}", {
        "key-name": keyName,
        "key-version": keyVersion,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .post(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { contentType: "application/json", headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers), body: (0, models_js_1.keySignParametersSerializer)(parameters) }));
}
async function _signDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.keyOperationResultDeserializer)(result.body);
}
/** The SIGN operation is applicable to asymmetric and symmetric keys stored in Azure Key Vault since this operation uses the private portion of the key. This operation requires the keys/sign permission. */
async function sign(context, keyName, keyVersion, parameters, options = { requestOptions: {} }) {
    const result = await _signSend(context, keyName, keyVersion, parameters, options);
    return _signDeserialize(result);
}
function _decryptSend(context, keyName, keyVersion, parameters, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/{key-name}/{key-version}/decrypt{?api%2Dversion}", {
        "key-name": keyName,
        "key-version": keyVersion,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .post(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { contentType: "application/json", headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers), body: (0, models_js_1.keyOperationsParametersSerializer)(parameters) }));
}
async function _decryptDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.keyOperationResultDeserializer)(result.body);
}
/** The DECRYPT operation decrypts a well-formed block of ciphertext using the target encryption key and specified algorithm. This operation is the reverse of the ENCRYPT operation; only a single block of data may be decrypted, the size of this block is dependent on the target key and the algorithm to be used. The DECRYPT operation applies to asymmetric and symmetric keys stored in Azure Key Vault since it uses the private portion of the key. This operation requires the keys/decrypt permission. Microsoft recommends not to use CBC algorithms for decryption without first ensuring the integrity of the ciphertext using an HMAC, for example. See https://learn.microsoft.com/dotnet/standard/security/vulnerabilities-cbc-mode for more information. */
async function decrypt(context, keyName, keyVersion, parameters, options = { requestOptions: {} }) {
    const result = await _decryptSend(context, keyName, keyVersion, parameters, options);
    return _decryptDeserialize(result);
}
function _encryptSend(context, keyName, keyVersion, parameters, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/{key-name}/{key-version}/encrypt{?api%2Dversion}", {
        "key-name": keyName,
        "key-version": keyVersion,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .post(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { contentType: "application/json", headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers), body: (0, models_js_1.keyOperationsParametersSerializer)(parameters) }));
}
async function _encryptDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.keyOperationResultDeserializer)(result.body);
}
/** The ENCRYPT operation encrypts an arbitrary sequence of bytes using an encryption key that is stored in Azure Key Vault. Note that the ENCRYPT operation only supports a single block of data, the size of which is dependent on the target key and the encryption algorithm to be used. The ENCRYPT operation is only strictly necessary for symmetric keys stored in Azure Key Vault since protection with an asymmetric key can be performed using public portion of the key. This operation is supported for asymmetric keys as a convenience for callers that have a key-reference but do not have access to the public key material. This operation requires the keys/encrypt permission. */
async function encrypt(context, keyName, keyVersion, parameters, options = { requestOptions: {} }) {
    const result = await _encryptSend(context, keyName, keyVersion, parameters, options);
    return _encryptDeserialize(result);
}
function _restoreKeySend(context, parameters, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/restore{?api%2Dversion}", {
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .post(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { contentType: "application/json", headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers), body: (0, models_js_1.keyRestoreParametersSerializer)(parameters) }));
}
async function _restoreKeyDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.keyBundleDeserializer)(result.body);
}
/** Imports a previously backed up key into Azure Key Vault, restoring the key, its key identifier, attributes and access control policies. The RESTORE operation may be used to import a previously backed up key. Individual versions of a key cannot be restored. The key is restored in its entirety with the same key name as it had when it was backed up. If the key name is not available in the target Key Vault, the RESTORE operation will be rejected. While the key name is retained during restore, the final key identifier will change if the key is restored to a different vault. Restore will restore all versions and preserve version identifiers. The RESTORE operation is subject to security constraints: The target Key Vault must be owned by the same Microsoft Azure Subscription as the source Key Vault The user must have RESTORE permission in the target Key Vault. This operation requires the keys/restore permission. */
async function restoreKey(context, parameters, options = { requestOptions: {} }) {
    const result = await _restoreKeySend(context, parameters, options);
    return _restoreKeyDeserialize(result);
}
function _backupKeySend(context, keyName, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/{key-name}/backup{?api%2Dversion}", {
        "key-name": keyName,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .post(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers) }));
}
async function _backupKeyDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.backupKeyResultDeserializer)(result.body);
}
/** The Key Backup operation exports a key from Azure Key Vault in a protected form. Note that this operation does NOT return key material in a form that can be used outside the Azure Key Vault system, the returned key material is either protected to a Azure Key Vault HSM or to Azure Key Vault itself. The intent of this operation is to allow a client to GENERATE a key in one Azure Key Vault instance, BACKUP the key, and then RESTORE it into another Azure Key Vault instance. The BACKUP operation may be used to export, in protected form, any key type from Azure Key Vault. Individual versions of a key cannot be backed up. BACKUP / RESTORE can be performed within geographical boundaries only; meaning that a BACKUP from one geographical area cannot be restored to another geographical area. For example, a backup from the US geographical area cannot be restored in an EU geographical area. This operation requires the key/backup permission. */
async function backupKey(context, keyName, options = { requestOptions: {} }) {
    const result = await _backupKeySend(context, keyName, options);
    return _backupKeyDeserialize(result);
}
function _getKeysSend(context, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys{?api%2Dversion,maxresults}", {
        "api%2Dversion": context.apiVersion,
        maxresults: options === null || options === void 0 ? void 0 : options.maxresults,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .get(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers) }));
}
async function _getKeysDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1._keyListResultDeserializer)(result.body);
}
/** Retrieves a list of the keys in the Key Vault as JSON Web Key structures that contain the public part of a stored key. The LIST operation is applicable to all key types, however only the base key identifier, attributes, and tags are provided in the response. Individual versions of a key are not listed in the response. This operation requires the keys/list permission. */
function getKeys(context, options = { requestOptions: {} }) {
    return (0, pagingHelpers_js_1.buildPagedAsyncIterator)(context, () => _getKeysSend(context, options), _getKeysDeserialize, ["200"], { itemName: "value", nextLinkName: "nextLink" });
}
function _getKeyVersionsSend(context, keyName, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/{key-name}/versions{?api%2Dversion,maxresults}", {
        "key-name": keyName,
        "api%2Dversion": context.apiVersion,
        maxresults: options === null || options === void 0 ? void 0 : options.maxresults,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .get(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers) }));
}
async function _getKeyVersionsDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1._keyListResultDeserializer)(result.body);
}
/** The full key identifier, attributes, and tags are provided in the response. This operation requires the keys/list permission. */
function getKeyVersions(context, keyName, options = { requestOptions: {} }) {
    return (0, pagingHelpers_js_1.buildPagedAsyncIterator)(context, () => _getKeyVersionsSend(context, keyName, options), _getKeyVersionsDeserialize, ["200"], { itemName: "value", nextLinkName: "nextLink" });
}
function _getKeySend(context, keyName, keyVersion, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/{key-name}/{key-version}{?api%2Dversion}", {
        "key-name": keyName,
        "key-version": keyVersion,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .get(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers) }));
}
async function _getKeyDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.keyBundleDeserializer)(result.body);
}
/** The get key operation is applicable to all key types. If the requested key is symmetric, then no key material is released in the response. This operation requires the keys/get permission. */
async function getKey(context, keyName, keyVersion, options = { requestOptions: {} }) {
    const result = await _getKeySend(context, keyName, keyVersion, options);
    return _getKeyDeserialize(result);
}
function _updateKeySend(context, keyName, keyVersion, parameters, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/{key-name}/{key-version}{?api%2Dversion}", {
        "key-name": keyName,
        "key-version": keyVersion,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .patch(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { contentType: "application/json", headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers), body: (0, models_js_1.keyUpdateParametersSerializer)(parameters) }));
}
async function _updateKeyDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.keyBundleDeserializer)(result.body);
}
/** In order to perform this operation, the key must already exist in the Key Vault. Note: The cryptographic material of a key itself cannot be changed. This operation requires the keys/update permission. */
async function updateKey(context, keyName, keyVersion, parameters, options = { requestOptions: {} }) {
    const result = await _updateKeySend(context, keyName, keyVersion, parameters, options);
    return _updateKeyDeserialize(result);
}
function _deleteKeySend(context, keyName, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/{key-name}{?api%2Dversion}", {
        "key-name": keyName,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .delete(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers) }));
}
async function _deleteKeyDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.deletedKeyBundleDeserializer)(result.body);
}
/** The delete key operation cannot be used to remove individual versions of a key. This operation removes the cryptographic material associated with the key, which means the key is not usable for Sign/Verify, Wrap/Unwrap or Encrypt/Decrypt operations. This operation requires the keys/delete permission. */
async function deleteKey(context, keyName, options = { requestOptions: {} }) {
    const result = await _deleteKeySend(context, keyName, options);
    return _deleteKeyDeserialize(result);
}
function _importKeySend(context, keyName, parameters, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/{key-name}{?api%2Dversion}", {
        "key-name": keyName,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .put(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { contentType: "application/json", headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers), body: (0, models_js_1.keyImportParametersSerializer)(parameters) }));
}
async function _importKeyDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.keyBundleDeserializer)(result.body);
}
/** The import key operation may be used to import any key type into an Azure Key Vault. If the named key already exists, Azure Key Vault creates a new version of the key. This operation requires the keys/import permission. */
async function importKey(context, keyName, parameters, options = { requestOptions: {} }) {
    const result = await _importKeySend(context, keyName, parameters, options);
    return _importKeyDeserialize(result);
}
function _rotateKeySend(context, keyName, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/{key-name}/rotate{?api%2Dversion}", {
        "key-name": keyName,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .post(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers) }));
}
async function _rotateKeyDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.keyBundleDeserializer)(result.body);
}
/** The operation will rotate the key based on the key policy. It requires the keys/rotate permission. */
async function rotateKey(context, keyName, options = { requestOptions: {} }) {
    const result = await _rotateKeySend(context, keyName, options);
    return _rotateKeyDeserialize(result);
}
function _createKeySend(context, keyName, parameters, options = { requestOptions: {} }) {
    var _a, _b;
    const path = (0, urlTemplate_js_1.expandUrlTemplate)("/keys/{key-name}/create{?api%2Dversion}", {
        "key-name": keyName,
        "api%2Dversion": context.apiVersion,
    }, {
        allowReserved: (_a = options === null || options === void 0 ? void 0 : options.requestOptions) === null || _a === void 0 ? void 0 : _a.skipUrlEncoding,
    });
    return context
        .path(path)
        .post(Object.assign(Object.assign({}, (0, core_client_1.operationOptionsToRequestParameters)(options)), { contentType: "application/json", headers: Object.assign({ accept: "application/json" }, (_b = options.requestOptions) === null || _b === void 0 ? void 0 : _b.headers), body: (0, models_js_1.keyCreateParametersSerializer)(parameters) }));
}
async function _createKeyDeserialize(result) {
    const expectedStatuses = ["200"];
    if (!expectedStatuses.includes(result.status)) {
        const error = (0, core_client_1.createRestError)(result);
        error.details = (0, models_js_1.keyVaultErrorDeserializer)(result.body);
        throw error;
    }
    return (0, models_js_1.keyBundleDeserializer)(result.body);
}
/** The create key operation can be used to create any key type in Azure Key Vault. If the named key already exists, Azure Key Vault creates a new version of the key. It requires the keys/create permission. */
async function createKey(context, keyName, parameters, options = { requestOptions: {} }) {
    const result = await _createKeySend(context, keyName, parameters, options);
    return _createKeyDeserialize(result);
}
//# sourceMappingURL=operations.js.map