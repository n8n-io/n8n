// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { __rest } from "tslib";
import { bearerTokenAuthenticationPolicy } from "@azure/core-rest-pipeline";
import { SDK_VERSION } from "../constants";
import { KeyVaultClient } from "../generated";
import { parseKeyVaultKeyIdentifier } from "../identifier";
import { LATEST_API_VERSION, } from "../keysModels";
import { getKeyFromKeyBundle } from "../transformations";
import { createHash } from "./crypto";
import { logger } from "../log";
import { createChallengeCallbacks } from "../../../keyvault-common/src";
import { tracingClient } from "../tracing";
/**
 * The remote cryptography provider is used to run crypto operations against KeyVault.
 * @internal
 */
export class RemoteCryptographyProvider {
    constructor(key, credential, pipelineOptions = {}) {
        var _a;
        this.client = getOrInitializeClient(credential, pipelineOptions);
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
            const result = await this.client.encrypt(this.vaultUrl, this.name, this.version, algorithm, plaintext, updatedOptions);
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
            const result = await this.client.decrypt(this.vaultUrl, this.name, this.version, algorithm, ciphertext, updatedOptions);
            return {
                result: result.result,
                keyID: this.getKeyID(),
                algorithm,
            };
        });
    }
    wrapKey(algorithm, keyToWrap, options = {}) {
        return tracingClient.withSpan("RemoteCryptographyProvider.wrapKey", options, async (updatedOptions) => {
            const result = await this.client.wrapKey(this.vaultUrl, this.name, this.version, algorithm, keyToWrap, updatedOptions);
            return {
                result: result.result,
                algorithm,
                keyID: this.getKeyID(),
            };
        });
    }
    unwrapKey(algorithm, encryptedKey, options = {}) {
        return tracingClient.withSpan("RemoteCryptographyProvider.unwrapKey", options, async (updatedOptions) => {
            const result = await this.client.unwrapKey(this.vaultUrl, this.name, this.version, algorithm, encryptedKey, updatedOptions);
            return {
                result: result.result,
                algorithm,
                keyID: this.getKeyID(),
            };
        });
    }
    sign(algorithm, digest, options = {}) {
        return tracingClient.withSpan("RemoteCryptographyProvider.sign", options, async (updatedOptions) => {
            const result = await this.client.sign(this.vaultUrl, this.name, this.version, algorithm, digest, updatedOptions);
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
            const response = await this.client.verify(this.vaultUrl, this.name, this.version, algorithm, digest, signature, updatedOptions);
            return {
                result: response.value ? response.value : false,
                keyID: this.getKeyID(),
            };
        });
    }
    signData(algorithm, data, options = {}) {
        return tracingClient.withSpan("RemoteCryptographyProvider.signData", options, async (updatedOptions) => {
            const digest = await createHash(algorithm, data);
            const result = await this.client.sign(this.vaultUrl, this.name, this.version, algorithm, digest, updatedOptions);
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
                const response = await this.client.getKey(this.vaultUrl, this.name, options && options.version ? options.version : this.version ? this.version : "", updatedOptions);
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
function getOrInitializeClient(credential, options) {
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
    const authPolicy = bearerTokenAuthenticationPolicy({
        credential,
        scopes: [],
        challengeCallbacks: createChallengeCallbacks(options),
    });
    const internalPipelineOptions = Object.assign(Object.assign({}, options), { loggingOptions: {
            logger: logger.info,
            allowedHeaderNames: [
                "x-ms-keyvault-region",
                "x-ms-keyvault-network-info",
                "x-ms-keyvault-service-version",
            ],
        } });
    const client = new KeyVaultClient(options.serviceVersion || LATEST_API_VERSION, internalPipelineOptions);
    client.pipeline.addPolicy(authPolicy);
    return client;
}
//# sourceMappingURL=remoteCryptographyProvider.js.map