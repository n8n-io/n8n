// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { __rest } from "tslib";
import { SDK_VERSION } from "../constants.js";
import { KeyVaultClient } from "../generated/index.js";
import { parseKeyVaultKeyIdentifier } from "../identifier.js";
import { LATEST_API_VERSION } from "../keysModels.js";
import { getKeyFromKeyBundle } from "../transformations.js";
import { createHash } from "./crypto.js";
import { logger } from "../log.js";
import { keyVaultAuthenticationPolicy } from "@azure/keyvault-common";
import { tracingClient } from "../tracing.js";
import { bearerTokenAuthenticationPolicyName } from "@azure/core-rest-pipeline";
/**
 * The remote cryptography provider is used to run crypto operations against KeyVault.
 * @internal
 */
export class RemoteCryptographyProvider {
    constructor(key, credential, pipelineOptions = {}) {
        var _a;
        this.key = key;
        let keyId;
        if (typeof key === "string") {
            keyId = key;
        }
        else {
            keyId = key.id;
        }
        try {
            const parsed = parseKeyVaultKeyIdentifier(keyId);
            if (parsed.name === "") {
                throw new Error("Could not find 'name' of key in key URL");
            }
            if (!parsed.vaultUrl || parsed.vaultUrl === "") {
                throw new Error("Could not find 'vaultUrl' of key in key URL");
            }
            this.vaultUrl = parsed.vaultUrl;
            this.name = parsed.name;
            this.version = (_a = parsed.version) !== null && _a !== void 0 ? _a : "";
            this.client = getOrInitializeClient(this.vaultUrl, credential, pipelineOptions);
        }
        catch (err) {
            logger.error(err);
            throw new Error(`${keyId} is not a valid Key Vault key ID`);
        }
    }
    // The remote client supports all algorithms and all operations.
    isSupported(_algorithm, _operation) {
        return true;
    }
    encrypt(encryptParameters, options = {}) {
        const { algorithm, plaintext } = encryptParameters, params = __rest(encryptParameters, ["algorithm", "plaintext"]);
        const requestOptions = Object.assign(Object.assign({}, options), params);
        return tracingClient.withSpan("RemoteCryptographyProvider.encrypt", requestOptions, async (updatedOptions) => {
            const result = await this.client.encrypt(this.name, this.version, {
                algorithm,
                value: plaintext,
                aad: "additionalAuthenticatedData" in encryptParameters
                    ? encryptParameters.additionalAuthenticatedData
                    : undefined,
                iv: "iv" in encryptParameters ? encryptParameters.iv : undefined,
            }, updatedOptions);
            return {
                algorithm: encryptParameters.algorithm,
                result: result.result,
                keyID: this.getKeyID(),
                additionalAuthenticatedData: result.additionalAuthenticatedData,
                authenticationTag: result.authenticationTag,
                iv: result.iv,
            };
        });
    }
    decrypt(decryptParameters, options = {}) {
        const { algorithm, ciphertext } = decryptParameters, params = __rest(decryptParameters, ["algorithm", "ciphertext"]);
        const requestOptions = Object.assign(Object.assign({}, options), params);
        return tracingClient.withSpan("RemoteCryptographyProvider.decrypt", requestOptions, async (updatedOptions) => {
            const result = await this.client.decrypt(this.name, this.version, {
                algorithm,
                value: ciphertext,
                aad: "additionalAuthenticatedData" in decryptParameters
                    ? decryptParameters.additionalAuthenticatedData
                    : undefined,
                iv: "iv" in decryptParameters ? decryptParameters.iv : undefined,
                tag: "authenticationTag" in decryptParameters
                    ? decryptParameters.authenticationTag
                    : undefined,
            }, updatedOptions);
            return {
                result: result.result,
                keyID: this.getKeyID(),
                algorithm,
            };
        });
    }
    wrapKey(algorithm, keyToWrap, options = {}) {
        return tracingClient.withSpan("RemoteCryptographyProvider.wrapKey", options, async (updatedOptions) => {
            const result = await this.client.wrapKey(this.name, this.version, {
                algorithm,
                value: keyToWrap,
            }, updatedOptions);
            return {
                result: result.result,
                algorithm,
                keyID: this.getKeyID(),
            };
        });
    }
    unwrapKey(algorithm, encryptedKey, options = {}) {
        return tracingClient.withSpan("RemoteCryptographyProvider.unwrapKey", options, async (updatedOptions) => {
            const result = await this.client.unwrapKey(this.name, this.version, {
                algorithm,
                value: encryptedKey,
            }, updatedOptions);
            return {
                result: result.result,
                algorithm,
                keyID: this.getKeyID(),
            };
        });
    }
    sign(algorithm, digest, options = {}) {
        return tracingClient.withSpan("RemoteCryptographyProvider.sign", options, async (updatedOptions) => {
            const result = await this.client.sign(this.name, this.version, {
                algorithm,
                value: digest,
            }, updatedOptions);
            return { result: result.result, algorithm, keyID: this.getKeyID() };
        });
    }
    verifyData(algorithm, data, signature, options = {}) {
        return tracingClient.withSpan("RemoteCryptographyProvider.verifyData", options, async (updatedOptions) => {
            const hash = await createHash(algorithm, data);
            return this.verify(algorithm, hash, signature, updatedOptions);
        });
    }
    verify(algorithm, digest, signature, options = {}) {
        return tracingClient.withSpan("RemoteCryptographyProvider.verify", options, async (updatedOptions) => {
            const response = await this.client.verify(this.name, this.version, {
                algorithm,
                digest,
                signature,
            }, updatedOptions);
            return {
                result: response.value ? response.value : false,
                keyID: this.getKeyID(),
            };
        });
    }
    signData(algorithm, data, options = {}) {
        return tracingClient.withSpan("RemoteCryptographyProvider.signData", options, async (updatedOptions) => {
            const digest = await createHash(algorithm, data);
            const result = await this.client.sign(this.name, this.version, {
                algorithm,
                value: digest,
            }, updatedOptions);
            return { result: result.result, algorithm, keyID: this.getKeyID() };
        });
    }
    /**
     * The ID of the key used to perform cryptographic operations for the client.
     */
    get keyId() {
        return this.getKeyID();
    }
    /**
     * Gets the {@link KeyVaultKey} used for cryptography operations, fetching it
     * from KeyVault if necessary.
     * @param options - Additional options.
     */
    getKey(options = {}) {
        return tracingClient.withSpan("RemoteCryptographyProvider.getKey", options, async (updatedOptions) => {
            if (typeof this.key === "string") {
                if (!this.name || this.name === "") {
                    throw new Error("getKey requires a key with a name");
                }
                const response = await this.client.getKey(this.name, options && options.version ? options.version : this.version ? this.version : "", updatedOptions);
                this.key = getKeyFromKeyBundle(response);
            }
            return this.key;
        });
    }
    /**
     * Attempts to retrieve the ID of the key.
     */
    getKeyID() {
        let kid;
        if (typeof this.key !== "string") {
            kid = this.key.id;
        }
        else {
            kid = this.key;
        }
        return kid;
    }
}
/**
 * A helper method to either get the passed down generated client or initialize a new one.
 * An already constructed generated client may be passed down from {@link KeyClient} in which case we should reuse it.
 *
 * @internal
 * @param credential - The credential to use when initializing a new client.
 * @param options - The options for constructing a client or the underlying client if one already exists.
 * @returns - A generated client instance
 */
function getOrInitializeClient(vaultUrl, credential, options) {
    if (options.generatedClient) {
        return options.generatedClient;
    }
    const libInfo = `azsdk-js-keyvault-keys/${SDK_VERSION}`;
    const userAgentOptions = options.userAgentOptions;
    options.userAgentOptions = {
        userAgentPrefix: userAgentOptions && userAgentOptions.userAgentPrefix
            ? `${userAgentOptions.userAgentPrefix} ${libInfo}`
            : libInfo,
    };
    const internalPipelineOptions = Object.assign(Object.assign({}, options), { apiVersion: options.serviceVersion || LATEST_API_VERSION, loggingOptions: {
            logger: logger.info,
            additionalAllowedHeaderNames: [
                "x-ms-keyvault-region",
                "x-ms-keyvault-network-info",
                "x-ms-keyvault-service-version",
            ],
        } });
    const client = new KeyVaultClient(vaultUrl, credential, internalPipelineOptions);
    client.pipeline.removePolicy({ name: bearerTokenAuthenticationPolicyName });
    client.pipeline.addPolicy(keyVaultAuthenticationPolicy(credential, options));
    // Workaround for: https://github.com/Azure/azure-sdk-for-js/issues/31843
    client.pipeline.addPolicy({
        name: "ContentTypePolicy",
        sendRequest(request, next) {
            var _a;
            const contentType = (_a = request.headers.get("Content-Type")) !== null && _a !== void 0 ? _a : "";
            if (contentType.startsWith("application/json")) {
                request.headers.set("Content-Type", "application/json");
            }
            return next(request);
        },
    });
    return client;
}
//# sourceMappingURL=remoteCryptographyProvider.js.map