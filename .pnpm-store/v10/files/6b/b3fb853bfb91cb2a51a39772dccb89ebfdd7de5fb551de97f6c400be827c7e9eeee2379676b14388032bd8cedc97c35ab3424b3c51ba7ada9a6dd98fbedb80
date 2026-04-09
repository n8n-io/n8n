"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnownVersions = exports.KnownKeyEncryptionAlgorithm = exports.KnownJsonWebKeySignatureAlgorithm = exports.KnownJsonWebKeyEncryptionAlgorithm = exports.KnownJsonWebKeyCurveName = exports.KnownDeletionRecoveryLevel = exports.KnownJsonWebKeyOperation = exports.KnownJsonWebKeyType = void 0;
exports.keyCreateParametersSerializer = keyCreateParametersSerializer;
exports.keyAttributesSerializer = keyAttributesSerializer;
exports.keyAttributesDeserializer = keyAttributesDeserializer;
exports.keyAttestationDeserializer = keyAttestationDeserializer;
exports.keyReleasePolicySerializer = keyReleasePolicySerializer;
exports.keyReleasePolicyDeserializer = keyReleasePolicyDeserializer;
exports.keyBundleDeserializer = keyBundleDeserializer;
exports.jsonWebKeySerializer = jsonWebKeySerializer;
exports.jsonWebKeyDeserializer = jsonWebKeyDeserializer;
exports.keyVaultErrorDeserializer = keyVaultErrorDeserializer;
exports._keyVaultErrorErrorDeserializer = _keyVaultErrorErrorDeserializer;
exports.keyImportParametersSerializer = keyImportParametersSerializer;
exports.deletedKeyBundleDeserializer = deletedKeyBundleDeserializer;
exports.keyUpdateParametersSerializer = keyUpdateParametersSerializer;
exports._keyListResultDeserializer = _keyListResultDeserializer;
exports.keyItemArrayDeserializer = keyItemArrayDeserializer;
exports.keyItemDeserializer = keyItemDeserializer;
exports.backupKeyResultDeserializer = backupKeyResultDeserializer;
exports.keyRestoreParametersSerializer = keyRestoreParametersSerializer;
exports.keyOperationsParametersSerializer = keyOperationsParametersSerializer;
exports.keyOperationResultDeserializer = keyOperationResultDeserializer;
exports.keySignParametersSerializer = keySignParametersSerializer;
exports.keyVerifyParametersSerializer = keyVerifyParametersSerializer;
exports.keyVerifyResultDeserializer = keyVerifyResultDeserializer;
exports.keyReleaseParametersSerializer = keyReleaseParametersSerializer;
exports.keyReleaseResultDeserializer = keyReleaseResultDeserializer;
exports._deletedKeyListResultDeserializer = _deletedKeyListResultDeserializer;
exports.deletedKeyItemArrayDeserializer = deletedKeyItemArrayDeserializer;
exports.deletedKeyItemDeserializer = deletedKeyItemDeserializer;
exports.keyRotationPolicySerializer = keyRotationPolicySerializer;
exports.keyRotationPolicyDeserializer = keyRotationPolicyDeserializer;
exports.lifetimeActionsArraySerializer = lifetimeActionsArraySerializer;
exports.lifetimeActionsArrayDeserializer = lifetimeActionsArrayDeserializer;
exports.lifetimeActionsSerializer = lifetimeActionsSerializer;
exports.lifetimeActionsDeserializer = lifetimeActionsDeserializer;
exports.lifetimeActionsTriggerSerializer = lifetimeActionsTriggerSerializer;
exports.lifetimeActionsTriggerDeserializer = lifetimeActionsTriggerDeserializer;
exports.lifetimeActionsTypeSerializer = lifetimeActionsTypeSerializer;
exports.lifetimeActionsTypeDeserializer = lifetimeActionsTypeDeserializer;
exports.keyRotationPolicyAttributesSerializer = keyRotationPolicyAttributesSerializer;
exports.keyRotationPolicyAttributesDeserializer = keyRotationPolicyAttributesDeserializer;
exports.getRandomBytesRequestSerializer = getRandomBytesRequestSerializer;
exports.randomBytesDeserializer = randomBytesDeserializer;
const core_util_1 = require("@azure/core-util");
function keyCreateParametersSerializer(item) {
    return {
        kty: item["kty"],
        key_size: item["keySize"],
        public_exponent: item["publicExponent"],
        key_ops: !item["keyOps"]
            ? item["keyOps"]
            : item["keyOps"].map((p) => {
                return p;
            }),
        attributes: !item["keyAttributes"]
            ? item["keyAttributes"]
            : keyAttributesSerializer(item["keyAttributes"]),
        tags: item["tags"],
        crv: item["curve"],
        release_policy: !item["releasePolicy"]
            ? item["releasePolicy"]
            : keyReleasePolicySerializer(item["releasePolicy"]),
    };
}
/** JsonWebKey Key Type (kty), as defined in https://tools.ietf.org/html/draft-ietf-jose-json-web-algorithms-40. */
var KnownJsonWebKeyType;
(function (KnownJsonWebKeyType) {
    /** Elliptic Curve. */
    KnownJsonWebKeyType["EC"] = "EC";
    /** Elliptic Curve with a private key which is stored in the HSM. */
    KnownJsonWebKeyType["ECHSM"] = "EC-HSM";
    /** RSA (https://tools.ietf.org/html/rfc3447) */
    KnownJsonWebKeyType["RSA"] = "RSA";
    /** RSA with a private key which is stored in the HSM. */
    KnownJsonWebKeyType["RSAHSM"] = "RSA-HSM";
    /** Octet sequence (used to represent symmetric keys) */
    KnownJsonWebKeyType["Oct"] = "oct";
    /** Octet sequence (used to represent symmetric keys) which is stored the HSM. */
    KnownJsonWebKeyType["OctHSM"] = "oct-HSM";
})(KnownJsonWebKeyType || (exports.KnownJsonWebKeyType = KnownJsonWebKeyType = {}));
/** JSON web key operations. For more information, see JsonWebKeyOperation. */
var KnownJsonWebKeyOperation;
(function (KnownJsonWebKeyOperation) {
    /** Indicates that the key can be used to encrypt. */
    KnownJsonWebKeyOperation["Encrypt"] = "encrypt";
    /** Indicates that the key can be used to decrypt. */
    KnownJsonWebKeyOperation["Decrypt"] = "decrypt";
    /** Indicates that the key can be used to sign. */
    KnownJsonWebKeyOperation["Sign"] = "sign";
    /** Indicates that the key can be used to verify. */
    KnownJsonWebKeyOperation["Verify"] = "verify";
    /** Indicates that the key can be used to wrap another key. */
    KnownJsonWebKeyOperation["WrapKey"] = "wrapKey";
    /** Indicates that the key can be used to unwrap another key. */
    KnownJsonWebKeyOperation["UnwrapKey"] = "unwrapKey";
    /** Indicates that the key can be imported during creation. */
    KnownJsonWebKeyOperation["Import"] = "import";
    /** Indicates that the private component of the key can be exported. */
    KnownJsonWebKeyOperation["Export"] = "export";
})(KnownJsonWebKeyOperation || (exports.KnownJsonWebKeyOperation = KnownJsonWebKeyOperation = {}));
function keyAttributesSerializer(item) {
    return {
        enabled: item["enabled"],
        nbf: !item["notBefore"]
            ? item["notBefore"]
            : (item["notBefore"].getTime() / 1000) | 0,
        exp: !item["expires"]
            ? item["expires"]
            : (item["expires"].getTime() / 1000) | 0,
        exportable: item["exportable"],
    };
}
function keyAttributesDeserializer(item) {
    return {
        enabled: item["enabled"],
        notBefore: !item["nbf"] ? item["nbf"] : new Date(item["nbf"] * 1000),
        expires: !item["exp"] ? item["exp"] : new Date(item["exp"] * 1000),
        created: !item["created"]
            ? item["created"]
            : new Date(item["created"] * 1000),
        updated: !item["updated"]
            ? item["updated"]
            : new Date(item["updated"] * 1000),
        recoverableDays: item["recoverableDays"],
        recoveryLevel: item["recoveryLevel"],
        exportable: item["exportable"],
        hsmPlatform: item["hsmPlatform"],
        attestation: !item["attestation"]
            ? item["attestation"]
            : keyAttestationDeserializer(item["attestation"]),
    };
}
/** Reflects the deletion recovery level currently in effect for certificates in the current vault. If it contains 'Purgeable', the certificate can be permanently deleted by a privileged user; otherwise, only the system can purge the certificate, at the end of the retention interval. */
var KnownDeletionRecoveryLevel;
(function (KnownDeletionRecoveryLevel) {
    /** Denotes a vault state in which deletion is an irreversible operation, without the possibility for recovery. This level corresponds to no protection being available against a Delete operation; the data is irretrievably lost upon accepting a Delete operation at the entity level or higher (vault, resource group, subscription etc.) */
    KnownDeletionRecoveryLevel["Purgeable"] = "Purgeable";
    /** Denotes a vault state in which deletion is recoverable, and which also permits immediate and permanent deletion (i.e. purge). This level guarantees the recoverability of the deleted entity during the retention interval (90 days), unless a Purge operation is requested, or the subscription is cancelled. System wil permanently delete it after 90 days, if not recovered */
    KnownDeletionRecoveryLevel["RecoverablePurgeable"] = "Recoverable+Purgeable";
    /** Denotes a vault state in which deletion is recoverable without the possibility for immediate and permanent deletion (i.e. purge). This level guarantees the recoverability of the deleted entity during the retention interval(90 days) and while the subscription is still available. System wil permanently delete it after 90 days, if not recovered */
    KnownDeletionRecoveryLevel["Recoverable"] = "Recoverable";
    /** Denotes a vault and subscription state in which deletion is recoverable within retention interval (90 days), immediate and permanent deletion (i.e. purge) is not permitted, and in which the subscription itself  cannot be permanently canceled. System wil permanently delete it after 90 days, if not recovered */
    KnownDeletionRecoveryLevel["RecoverableProtectedSubscription"] = "Recoverable+ProtectedSubscription";
    /** Denotes a vault state in which deletion is recoverable, and which also permits immediate and permanent deletion (i.e. purge when 7 <= SoftDeleteRetentionInDays < 90). This level guarantees the recoverability of the deleted entity during the retention interval, unless a Purge operation is requested, or the subscription is cancelled. */
    KnownDeletionRecoveryLevel["CustomizedRecoverablePurgeable"] = "CustomizedRecoverable+Purgeable";
    /** Denotes a vault state in which deletion is recoverable without the possibility for immediate and permanent deletion (i.e. purge when 7 <= SoftDeleteRetentionInDays < 90).This level guarantees the recoverability of the deleted entity during the retention interval and while the subscription is still available. */
    KnownDeletionRecoveryLevel["CustomizedRecoverable"] = "CustomizedRecoverable";
    /** Denotes a vault and subscription state in which deletion is recoverable, immediate and permanent deletion (i.e. purge) is not permitted, and in which the subscription itself cannot be permanently canceled when 7 <= SoftDeleteRetentionInDays < 90. This level guarantees the recoverability of the deleted entity during the retention interval, and also reflects the fact that the subscription itself cannot be cancelled. */
    KnownDeletionRecoveryLevel["CustomizedRecoverableProtectedSubscription"] = "CustomizedRecoverable+ProtectedSubscription";
})(KnownDeletionRecoveryLevel || (exports.KnownDeletionRecoveryLevel = KnownDeletionRecoveryLevel = {}));
function keyAttestationDeserializer(item) {
    return {
        certificatePemFile: !item["certificatePemFile"]
            ? item["certificatePemFile"]
            : typeof item["certificatePemFile"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["certificatePemFile"], "base64url")
                : item["certificatePemFile"],
        privateKeyAttestation: !item["privateKeyAttestation"]
            ? item["privateKeyAttestation"]
            : typeof item["privateKeyAttestation"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["privateKeyAttestation"], "base64url")
                : item["privateKeyAttestation"],
        publicKeyAttestation: !item["publicKeyAttestation"]
            ? item["publicKeyAttestation"]
            : typeof item["publicKeyAttestation"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["publicKeyAttestation"], "base64url")
                : item["publicKeyAttestation"],
        version: item["version"],
    };
}
/** Elliptic curve name. For valid values, see JsonWebKeyCurveName. */
var KnownJsonWebKeyCurveName;
(function (KnownJsonWebKeyCurveName) {
    /** The NIST P-256 elliptic curve, AKA SECG curve SECP256R1. */
    KnownJsonWebKeyCurveName["P256"] = "P-256";
    /** The NIST P-384 elliptic curve, AKA SECG curve SECP384R1. */
    KnownJsonWebKeyCurveName["P384"] = "P-384";
    /** The NIST P-521 elliptic curve, AKA SECG curve SECP521R1. */
    KnownJsonWebKeyCurveName["P521"] = "P-521";
    /** The SECG SECP256K1 elliptic curve. */
    KnownJsonWebKeyCurveName["P256K"] = "P-256K";
})(KnownJsonWebKeyCurveName || (exports.KnownJsonWebKeyCurveName = KnownJsonWebKeyCurveName = {}));
function keyReleasePolicySerializer(item) {
    return {
        contentType: item["contentType"],
        immutable: item["immutable"],
        data: !item["encodedPolicy"]
            ? item["encodedPolicy"]
            : (0, core_util_1.uint8ArrayToString)(item["encodedPolicy"], "base64url"),
    };
}
function keyReleasePolicyDeserializer(item) {
    return {
        contentType: item["contentType"],
        immutable: item["immutable"],
        encodedPolicy: !item["data"]
            ? item["data"]
            : typeof item["data"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["data"], "base64url")
                : item["data"],
    };
}
function keyBundleDeserializer(item) {
    return {
        key: !item["key"] ? item["key"] : jsonWebKeyDeserializer(item["key"]),
        attributes: !item["attributes"]
            ? item["attributes"]
            : keyAttributesDeserializer(item["attributes"]),
        tags: item["tags"],
        managed: item["managed"],
        releasePolicy: !item["release_policy"]
            ? item["release_policy"]
            : keyReleasePolicyDeserializer(item["release_policy"]),
    };
}
function jsonWebKeySerializer(item) {
    return {
        kid: item["kid"],
        kty: item["kty"],
        key_ops: !item["keyOps"]
            ? item["keyOps"]
            : item["keyOps"].map((p) => {
                return p;
            }),
        n: !item["n"] ? item["n"] : (0, core_util_1.uint8ArrayToString)(item["n"], "base64url"),
        e: !item["e"] ? item["e"] : (0, core_util_1.uint8ArrayToString)(item["e"], "base64url"),
        d: !item["d"] ? item["d"] : (0, core_util_1.uint8ArrayToString)(item["d"], "base64url"),
        dp: !item["dp"] ? item["dp"] : (0, core_util_1.uint8ArrayToString)(item["dp"], "base64url"),
        dq: !item["dq"] ? item["dq"] : (0, core_util_1.uint8ArrayToString)(item["dq"], "base64url"),
        qi: !item["qi"] ? item["qi"] : (0, core_util_1.uint8ArrayToString)(item["qi"], "base64url"),
        p: !item["p"] ? item["p"] : (0, core_util_1.uint8ArrayToString)(item["p"], "base64url"),
        q: !item["q"] ? item["q"] : (0, core_util_1.uint8ArrayToString)(item["q"], "base64url"),
        k: !item["k"] ? item["k"] : (0, core_util_1.uint8ArrayToString)(item["k"], "base64url"),
        key_hsm: !item["t"]
            ? item["t"]
            : (0, core_util_1.uint8ArrayToString)(item["t"], "base64url"),
        crv: item["crv"],
        x: !item["x"] ? item["x"] : (0, core_util_1.uint8ArrayToString)(item["x"], "base64url"),
        y: !item["y"] ? item["y"] : (0, core_util_1.uint8ArrayToString)(item["y"], "base64url"),
    };
}
function jsonWebKeyDeserializer(item) {
    return {
        kid: item["kid"],
        kty: item["kty"],
        keyOps: !item["key_ops"]
            ? item["key_ops"]
            : item["key_ops"].map((p) => {
                return p;
            }),
        n: !item["n"]
            ? item["n"]
            : typeof item["n"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["n"], "base64url")
                : item["n"],
        e: !item["e"]
            ? item["e"]
            : typeof item["e"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["e"], "base64url")
                : item["e"],
        d: !item["d"]
            ? item["d"]
            : typeof item["d"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["d"], "base64url")
                : item["d"],
        dp: !item["dp"]
            ? item["dp"]
            : typeof item["dp"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["dp"], "base64url")
                : item["dp"],
        dq: !item["dq"]
            ? item["dq"]
            : typeof item["dq"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["dq"], "base64url")
                : item["dq"],
        qi: !item["qi"]
            ? item["qi"]
            : typeof item["qi"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["qi"], "base64url")
                : item["qi"],
        p: !item["p"]
            ? item["p"]
            : typeof item["p"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["p"], "base64url")
                : item["p"],
        q: !item["q"]
            ? item["q"]
            : typeof item["q"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["q"], "base64url")
                : item["q"],
        k: !item["k"]
            ? item["k"]
            : typeof item["k"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["k"], "base64url")
                : item["k"],
        t: !item["key_hsm"]
            ? item["key_hsm"]
            : typeof item["key_hsm"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["key_hsm"], "base64url")
                : item["key_hsm"],
        crv: item["crv"],
        x: !item["x"]
            ? item["x"]
            : typeof item["x"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["x"], "base64url")
                : item["x"],
        y: !item["y"]
            ? item["y"]
            : typeof item["y"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["y"], "base64url")
                : item["y"],
    };
}
function keyVaultErrorDeserializer(item) {
    return {
        error: !item["error"]
            ? item["error"]
            : _keyVaultErrorErrorDeserializer(item["error"]),
    };
}
function _keyVaultErrorErrorDeserializer(item) {
    return {
        code: item["code"],
        message: item["message"],
        innerError: !item["innererror"]
            ? item["innererror"]
            : _keyVaultErrorErrorDeserializer(item["innererror"]),
    };
}
function keyImportParametersSerializer(item) {
    return {
        Hsm: item["hsm"],
        key: jsonWebKeySerializer(item["key"]),
        attributes: !item["keyAttributes"]
            ? item["keyAttributes"]
            : keyAttributesSerializer(item["keyAttributes"]),
        tags: item["tags"],
        release_policy: !item["releasePolicy"]
            ? item["releasePolicy"]
            : keyReleasePolicySerializer(item["releasePolicy"]),
    };
}
function deletedKeyBundleDeserializer(item) {
    return {
        key: !item["key"] ? item["key"] : jsonWebKeyDeserializer(item["key"]),
        attributes: !item["attributes"]
            ? item["attributes"]
            : keyAttributesDeserializer(item["attributes"]),
        tags: item["tags"],
        managed: item["managed"],
        releasePolicy: !item["release_policy"]
            ? item["release_policy"]
            : keyReleasePolicyDeserializer(item["release_policy"]),
        recoveryId: item["recoveryId"],
        scheduledPurgeDate: !item["scheduledPurgeDate"]
            ? item["scheduledPurgeDate"]
            : new Date(item["scheduledPurgeDate"] * 1000),
        deletedDate: !item["deletedDate"]
            ? item["deletedDate"]
            : new Date(item["deletedDate"] * 1000),
    };
}
function keyUpdateParametersSerializer(item) {
    return {
        key_ops: !item["keyOps"]
            ? item["keyOps"]
            : item["keyOps"].map((p) => {
                return p;
            }),
        attributes: !item["keyAttributes"]
            ? item["keyAttributes"]
            : keyAttributesSerializer(item["keyAttributes"]),
        tags: item["tags"],
        release_policy: !item["releasePolicy"]
            ? item["releasePolicy"]
            : keyReleasePolicySerializer(item["releasePolicy"]),
    };
}
function _keyListResultDeserializer(item) {
    return {
        value: !item["value"]
            ? item["value"]
            : keyItemArrayDeserializer(item["value"]),
        nextLink: item["nextLink"],
    };
}
function keyItemArrayDeserializer(result) {
    return result.map((item) => {
        return keyItemDeserializer(item);
    });
}
function keyItemDeserializer(item) {
    return {
        kid: item["kid"],
        attributes: !item["attributes"]
            ? item["attributes"]
            : keyAttributesDeserializer(item["attributes"]),
        tags: item["tags"],
        managed: item["managed"],
    };
}
function backupKeyResultDeserializer(item) {
    return {
        value: !item["value"]
            ? item["value"]
            : typeof item["value"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["value"], "base64url")
                : item["value"],
    };
}
function keyRestoreParametersSerializer(item) {
    return { value: (0, core_util_1.uint8ArrayToString)(item["keyBundleBackup"], "base64url") };
}
function keyOperationsParametersSerializer(item) {
    return {
        alg: item["algorithm"],
        value: (0, core_util_1.uint8ArrayToString)(item["value"], "base64url"),
        iv: !item["iv"] ? item["iv"] : (0, core_util_1.uint8ArrayToString)(item["iv"], "base64url"),
        aad: !item["aad"]
            ? item["aad"]
            : (0, core_util_1.uint8ArrayToString)(item["aad"], "base64url"),
        tag: !item["tag"]
            ? item["tag"]
            : (0, core_util_1.uint8ArrayToString)(item["tag"], "base64url"),
    };
}
/** An algorithm used for encryption and decryption. */
var KnownJsonWebKeyEncryptionAlgorithm;
(function (KnownJsonWebKeyEncryptionAlgorithm) {
    /** [Not recommended] RSAES using Optimal Asymmetric Encryption Padding (OAEP), as described in https://tools.ietf.org/html/rfc3447, with the default parameters specified by RFC 3447 in Section A.2.1. Those default parameters are using a hash function of SHA-1 and a mask generation function of MGF1 with SHA-1. Microsoft recommends using RSA_OAEP_256 or stronger algorithms for enhanced security. Microsoft does *not* recommend RSA_OAEP, which is included solely for backwards compatibility. RSA_OAEP utilizes SHA1, which has known collision problems. */
    KnownJsonWebKeyEncryptionAlgorithm["RSAOaep"] = "RSA-OAEP";
    /** RSAES using Optimal Asymmetric Encryption Padding with a hash function of SHA-256 and a mask generation function of MGF1 with SHA-256. */
    KnownJsonWebKeyEncryptionAlgorithm["RSAOaep256"] = "RSA-OAEP-256";
    /** [Not recommended] RSAES-PKCS1-V1_5 key encryption, as described in https://tools.ietf.org/html/rfc3447. Microsoft recommends using RSA_OAEP_256 or stronger algorithms for enhanced security. Microsoft does *not* recommend RSA_1_5, which is included solely for backwards compatibility. Cryptographic standards no longer consider RSA with the PKCS#1 v1.5 padding scheme secure for encryption. */
    KnownJsonWebKeyEncryptionAlgorithm["RSA15"] = "RSA1_5";
    /** 128-bit AES-GCM. */
    KnownJsonWebKeyEncryptionAlgorithm["A128GCM"] = "A128GCM";
    /** 192-bit AES-GCM. */
    KnownJsonWebKeyEncryptionAlgorithm["A192GCM"] = "A192GCM";
    /** 256-bit AES-GCM. */
    KnownJsonWebKeyEncryptionAlgorithm["A256GCM"] = "A256GCM";
    /** 128-bit AES key wrap. */
    KnownJsonWebKeyEncryptionAlgorithm["A128KW"] = "A128KW";
    /** 192-bit AES key wrap. */
    KnownJsonWebKeyEncryptionAlgorithm["A192KW"] = "A192KW";
    /** 256-bit AES key wrap. */
    KnownJsonWebKeyEncryptionAlgorithm["A256KW"] = "A256KW";
    /** 128-bit AES-CBC. */
    KnownJsonWebKeyEncryptionAlgorithm["A128CBC"] = "A128CBC";
    /** 192-bit AES-CBC. */
    KnownJsonWebKeyEncryptionAlgorithm["A192CBC"] = "A192CBC";
    /** 256-bit AES-CBC. */
    KnownJsonWebKeyEncryptionAlgorithm["A256CBC"] = "A256CBC";
    /** 128-bit AES-CBC with PKCS padding. */
    KnownJsonWebKeyEncryptionAlgorithm["A128Cbcpad"] = "A128CBCPAD";
    /** 192-bit AES-CBC with PKCS padding. */
    KnownJsonWebKeyEncryptionAlgorithm["A192Cbcpad"] = "A192CBCPAD";
    /** 256-bit AES-CBC with PKCS padding. */
    KnownJsonWebKeyEncryptionAlgorithm["A256Cbcpad"] = "A256CBCPAD";
    /** CKM AES key wrap. */
    KnownJsonWebKeyEncryptionAlgorithm["CkmAesKeyWrap"] = "CKM_AES_KEY_WRAP";
    /** CKM AES key wrap with padding. */
    KnownJsonWebKeyEncryptionAlgorithm["CkmAesKeyWrapPad"] = "CKM_AES_KEY_WRAP_PAD";
})(KnownJsonWebKeyEncryptionAlgorithm || (exports.KnownJsonWebKeyEncryptionAlgorithm = KnownJsonWebKeyEncryptionAlgorithm = {}));
function keyOperationResultDeserializer(item) {
    return {
        kid: item["kid"],
        result: !item["value"]
            ? item["value"]
            : typeof item["value"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["value"], "base64url")
                : item["value"],
        iv: !item["iv"]
            ? item["iv"]
            : typeof item["iv"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["iv"], "base64url")
                : item["iv"],
        authenticationTag: !item["tag"]
            ? item["tag"]
            : typeof item["tag"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["tag"], "base64url")
                : item["tag"],
        additionalAuthenticatedData: !item["aad"]
            ? item["aad"]
            : typeof item["aad"] === "string"
                ? (0, core_util_1.stringToUint8Array)(item["aad"], "base64url")
                : item["aad"],
    };
}
function keySignParametersSerializer(item) {
    return {
        alg: item["algorithm"],
        value: (0, core_util_1.uint8ArrayToString)(item["value"], "base64url"),
    };
}
/** The signing/verification algorithm identifier. For more information on possible algorithm types, see JsonWebKeySignatureAlgorithm. */
var KnownJsonWebKeySignatureAlgorithm;
(function (KnownJsonWebKeySignatureAlgorithm) {
    /** RSASSA-PSS using SHA-256 and MGF1 with SHA-256, as described in https://tools.ietf.org/html/rfc7518 */
    KnownJsonWebKeySignatureAlgorithm["PS256"] = "PS256";
    /** RSASSA-PSS using SHA-384 and MGF1 with SHA-384, as described in https://tools.ietf.org/html/rfc7518 */
    KnownJsonWebKeySignatureAlgorithm["PS384"] = "PS384";
    /** RSASSA-PSS using SHA-512 and MGF1 with SHA-512, as described in https://tools.ietf.org/html/rfc7518 */
    KnownJsonWebKeySignatureAlgorithm["PS512"] = "PS512";
    /** RSASSA-PKCS1-v1_5 using SHA-256, as described in https://tools.ietf.org/html/rfc7518 */
    KnownJsonWebKeySignatureAlgorithm["RS256"] = "RS256";
    /** RSASSA-PKCS1-v1_5 using SHA-384, as described in https://tools.ietf.org/html/rfc7518 */
    KnownJsonWebKeySignatureAlgorithm["RS384"] = "RS384";
    /** RSASSA-PKCS1-v1_5 using SHA-512, as described in https://tools.ietf.org/html/rfc7518 */
    KnownJsonWebKeySignatureAlgorithm["RS512"] = "RS512";
    /** HMAC using SHA-256, as described in  https://tools.ietf.org/html/rfc7518 */
    KnownJsonWebKeySignatureAlgorithm["HS256"] = "HS256";
    /** HMAC using SHA-384, as described in https://tools.ietf.org/html/rfc7518 */
    KnownJsonWebKeySignatureAlgorithm["HS384"] = "HS384";
    /** HMAC using SHA-512, as described in https://tools.ietf.org/html/rfc7518 */
    KnownJsonWebKeySignatureAlgorithm["HS512"] = "HS512";
    /** Reserved */
    KnownJsonWebKeySignatureAlgorithm["Rsnull"] = "RSNULL";
    /** ECDSA using P-256 and SHA-256, as described in https://tools.ietf.org/html/rfc7518. */
    KnownJsonWebKeySignatureAlgorithm["ES256"] = "ES256";
    /** ECDSA using P-384 and SHA-384, as described in https://tools.ietf.org/html/rfc7518 */
    KnownJsonWebKeySignatureAlgorithm["ES384"] = "ES384";
    /** ECDSA using P-521 and SHA-512, as described in https://tools.ietf.org/html/rfc7518 */
    KnownJsonWebKeySignatureAlgorithm["ES512"] = "ES512";
    /** ECDSA using P-256K and SHA-256, as described in https://tools.ietf.org/html/rfc7518 */
    KnownJsonWebKeySignatureAlgorithm["ES256K"] = "ES256K";
})(KnownJsonWebKeySignatureAlgorithm || (exports.KnownJsonWebKeySignatureAlgorithm = KnownJsonWebKeySignatureAlgorithm = {}));
function keyVerifyParametersSerializer(item) {
    return {
        alg: item["algorithm"],
        digest: (0, core_util_1.uint8ArrayToString)(item["digest"], "base64url"),
        value: (0, core_util_1.uint8ArrayToString)(item["signature"], "base64url"),
    };
}
function keyVerifyResultDeserializer(item) {
    return {
        value: item["value"],
    };
}
function keyReleaseParametersSerializer(item) {
    return {
        target: item["targetAttestationToken"],
        nonce: item["nonce"],
        enc: item["enc"],
    };
}
/** The encryption algorithm to use to protected the exported key material */
var KnownKeyEncryptionAlgorithm;
(function (KnownKeyEncryptionAlgorithm) {
    /** The CKM_RSA_AES_KEY_WRAP key wrap mechanism. */
    KnownKeyEncryptionAlgorithm["CkmRsaAesKeyWrap"] = "CKM_RSA_AES_KEY_WRAP";
    /** The RSA_AES_KEY_WRAP_256 key wrap mechanism. */
    KnownKeyEncryptionAlgorithm["RsaAesKeyWrap256"] = "RSA_AES_KEY_WRAP_256";
    /** The RSA_AES_KEY_WRAP_384 key wrap mechanism. */
    KnownKeyEncryptionAlgorithm["RsaAesKeyWrap384"] = "RSA_AES_KEY_WRAP_384";
})(KnownKeyEncryptionAlgorithm || (exports.KnownKeyEncryptionAlgorithm = KnownKeyEncryptionAlgorithm = {}));
function keyReleaseResultDeserializer(item) {
    return {
        value: item["value"],
    };
}
function _deletedKeyListResultDeserializer(item) {
    return {
        value: !item["value"]
            ? item["value"]
            : deletedKeyItemArrayDeserializer(item["value"]),
        nextLink: item["nextLink"],
    };
}
function deletedKeyItemArrayDeserializer(result) {
    return result.map((item) => {
        return deletedKeyItemDeserializer(item);
    });
}
function deletedKeyItemDeserializer(item) {
    return {
        kid: item["kid"],
        attributes: !item["attributes"]
            ? item["attributes"]
            : keyAttributesDeserializer(item["attributes"]),
        tags: item["tags"],
        managed: item["managed"],
        recoveryId: item["recoveryId"],
        scheduledPurgeDate: !item["scheduledPurgeDate"]
            ? item["scheduledPurgeDate"]
            : new Date(item["scheduledPurgeDate"] * 1000),
        deletedDate: !item["deletedDate"]
            ? item["deletedDate"]
            : new Date(item["deletedDate"] * 1000),
    };
}
function keyRotationPolicySerializer(item) {
    return {
        lifetimeActions: !item["lifetimeActions"]
            ? item["lifetimeActions"]
            : lifetimeActionsArraySerializer(item["lifetimeActions"]),
        attributes: !item["attributes"]
            ? item["attributes"]
            : keyRotationPolicyAttributesSerializer(item["attributes"]),
    };
}
function keyRotationPolicyDeserializer(item) {
    return {
        id: item["id"],
        lifetimeActions: !item["lifetimeActions"]
            ? item["lifetimeActions"]
            : lifetimeActionsArrayDeserializer(item["lifetimeActions"]),
        attributes: !item["attributes"]
            ? item["attributes"]
            : keyRotationPolicyAttributesDeserializer(item["attributes"]),
    };
}
function lifetimeActionsArraySerializer(result) {
    return result.map((item) => {
        return lifetimeActionsSerializer(item);
    });
}
function lifetimeActionsArrayDeserializer(result) {
    return result.map((item) => {
        return lifetimeActionsDeserializer(item);
    });
}
function lifetimeActionsSerializer(item) {
    return {
        trigger: !item["trigger"]
            ? item["trigger"]
            : lifetimeActionsTriggerSerializer(item["trigger"]),
        action: !item["action"]
            ? item["action"]
            : lifetimeActionsTypeSerializer(item["action"]),
    };
}
function lifetimeActionsDeserializer(item) {
    return {
        trigger: !item["trigger"]
            ? item["trigger"]
            : lifetimeActionsTriggerDeserializer(item["trigger"]),
        action: !item["action"]
            ? item["action"]
            : lifetimeActionsTypeDeserializer(item["action"]),
    };
}
function lifetimeActionsTriggerSerializer(item) {
    return {
        timeAfterCreate: item["timeAfterCreate"],
        timeBeforeExpiry: item["timeBeforeExpiry"],
    };
}
function lifetimeActionsTriggerDeserializer(item) {
    return {
        timeAfterCreate: item["timeAfterCreate"],
        timeBeforeExpiry: item["timeBeforeExpiry"],
    };
}
function lifetimeActionsTypeSerializer(item) {
    return { type: item["type"] };
}
function lifetimeActionsTypeDeserializer(item) {
    return {
        type: item["type"],
    };
}
function keyRotationPolicyAttributesSerializer(item) {
    return { expiryTime: item["expiryTime"] };
}
function keyRotationPolicyAttributesDeserializer(item) {
    return {
        expiryTime: item["expiryTime"],
        created: !item["created"]
            ? item["created"]
            : new Date(item["created"] * 1000),
        updated: !item["updated"]
            ? item["updated"]
            : new Date(item["updated"] * 1000),
    };
}
function getRandomBytesRequestSerializer(item) {
    return { count: item["count"] };
}
function randomBytesDeserializer(item) {
    return {
        value: typeof item["value"] === "string"
            ? (0, core_util_1.stringToUint8Array)(item["value"], "base64url")
            : item["value"],
    };
}
/** The available API versions. */
var KnownVersions;
(function (KnownVersions) {
    /** The 7.5 API version. */
    KnownVersions["V75"] = "7.5";
    /** The 7.6-preview.2 API version. */
    KnownVersions["V76Preview2"] = "7.6-preview.2";
    /** The 7.6 API version. */
    KnownVersions["V76"] = "7.6";
})(KnownVersions || (exports.KnownVersions = KnownVersions = {}));
//# sourceMappingURL=models.js.map