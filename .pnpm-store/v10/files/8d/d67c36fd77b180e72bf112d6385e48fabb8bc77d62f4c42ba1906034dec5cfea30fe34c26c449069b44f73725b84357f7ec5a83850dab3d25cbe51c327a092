// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { __rest } from "tslib";
import { convertHttpClient, createRequestPolicyFactoryPolicy, } from "@azure/core-http-compat";
import { bearerTokenAuthenticationPolicy, decompressResponsePolicyName, } from "@azure/core-rest-pipeline";
import { authorizeRequestOnTenantChallenge, createClientPipeline } from "@azure/core-client";
import { parseXML, stringifyXML } from "@azure/core-xml";
import { isTokenCredential } from "@azure/core-auth";
import { logger } from "./log";
import { StorageRetryPolicyFactory } from "./StorageRetryPolicyFactory";
import { StorageSharedKeyCredential } from "./credentials/StorageSharedKeyCredential";
import { AnonymousCredential } from "./credentials/AnonymousCredential";
import { StorageOAuthScopes, StorageBlobLoggingAllowedHeaderNames, StorageBlobLoggingAllowedQueryParameters, SDK_VERSION, } from "./utils/constants";
import { getCachedDefaultHttpClient } from "./utils/cache";
import { storageBrowserPolicy } from "./policies/StorageBrowserPolicyV2";
import { storageRetryPolicy } from "./policies/StorageRetryPolicyV2";
import { storageSharedKeyCredentialPolicy } from "./policies/StorageSharedKeyCredentialPolicyV2";
import { StorageBrowserPolicyFactory } from "./StorageBrowserPolicyFactory";
import { storageCorrectContentLengthPolicy } from "./policies/StorageCorrectContentLengthPolicy";
// Export following interfaces and types for customers who want to implement their
// own RequestPolicy or HTTPClient
export { StorageOAuthScopes, };
/**
 * A helper to decide if a given argument satisfies the Pipeline contract
 * @param pipeline - An argument that may be a Pipeline
 * @returns true when the argument satisfies the Pipeline contract
 */
export function isPipelineLike(pipeline) {
    if (!pipeline || typeof pipeline !== "object") {
        return false;
    }
    const castPipeline = pipeline;
    return (Array.isArray(castPipeline.factories) &&
        typeof castPipeline.options === "object" &&
        typeof castPipeline.toServiceClientOptions === "function");
}
/**
 * A Pipeline class containing HTTP request policies.
 * You can create a default Pipeline by calling {@link newPipeline}.
 * Or you can create a Pipeline with your own policies by the constructor of Pipeline.
 *
 * Refer to {@link newPipeline} and provided policies before implementing your
 * customized Pipeline.
 */
export class Pipeline {
    /**
     * Creates an instance of Pipeline. Customize HTTPClient by implementing IHttpClient interface.
     *
     * @param factories -
     * @param options -
     */
    constructor(factories, options = {}) {
        this.factories = factories;
        this.options = options;
    }
    /**
     * Transfer Pipeline object to ServiceClientOptions object which is required by
     * ServiceClient constructor.
     *
     * @returns The ServiceClientOptions object from this Pipeline.
     */
    toServiceClientOptions() {
        return {
            httpClient: this.options.httpClient,
            requestPolicyFactories: this.factories,
        };
    }
}
/**
 * Creates a new Pipeline object with Credential provided.
 *
 * @param credential -  Such as AnonymousCredential, StorageSharedKeyCredential or any credential from the `@azure/identity` package to authenticate requests to the service. You can also provide an object that implements the TokenCredential interface. If not specified, AnonymousCredential is used.
 * @param pipelineOptions - Optional. Options.
 * @returns A new Pipeline object.
 */
export function newPipeline(credential, pipelineOptions = {}) {
    if (!credential) {
        credential = new AnonymousCredential();
    }
    const pipeline = new Pipeline([], pipelineOptions);
    pipeline._credential = credential;
    return pipeline;
}
function processDownlevelPipeline(pipeline) {
    const knownFactoryFunctions = [
        isAnonymousCredential,
        isStorageSharedKeyCredential,
        isCoreHttpBearerTokenFactory,
        isStorageBrowserPolicyFactory,
        isStorageRetryPolicyFactory,
        isStorageTelemetryPolicyFactory,
        isCoreHttpPolicyFactory,
    ];
    if (pipeline.factories.length) {
        const novelFactories = pipeline.factories.filter((factory) => {
            return !knownFactoryFunctions.some((knownFactory) => knownFactory(factory));
        });
        if (novelFactories.length) {
            const hasInjector = novelFactories.some((factory) => isInjectorPolicyFactory(factory));
            // if there are any left over, wrap in a requestPolicyFactoryPolicy
            return {
                wrappedPolicies: createRequestPolicyFactoryPolicy(novelFactories),
                afterRetry: hasInjector,
            };
        }
    }
    return undefined;
}
export function getCoreClientOptions(pipeline) {
    var _a;
    const _b = pipeline.options, { httpClient: v1Client } = _b, restOptions = __rest(_b, ["httpClient"]);
    let httpClient = pipeline._coreHttpClient;
    if (!httpClient) {
        httpClient = v1Client ? convertHttpClient(v1Client) : getCachedDefaultHttpClient();
        pipeline._coreHttpClient = httpClient;
    }
    let corePipeline = pipeline._corePipeline;
    if (!corePipeline) {
        const packageDetails = `azsdk-js-azure-storage-blob/${SDK_VERSION}`;
        const userAgentPrefix = restOptions.userAgentOptions && restOptions.userAgentOptions.userAgentPrefix
            ? `${restOptions.userAgentOptions.userAgentPrefix} ${packageDetails}`
            : `${packageDetails}`;
        corePipeline = createClientPipeline(Object.assign(Object.assign({}, restOptions), { loggingOptions: {
                additionalAllowedHeaderNames: StorageBlobLoggingAllowedHeaderNames,
                additionalAllowedQueryParameters: StorageBlobLoggingAllowedQueryParameters,
                logger: logger.info,
            }, userAgentOptions: {
                userAgentPrefix,
            }, serializationOptions: {
                stringifyXML,
                serializerOptions: {
                    xml: {
                        // Use customized XML char key of "#" so we can deserialize metadata
                        // with "_" key
                        xmlCharKey: "#",
                    },
                },
            }, deserializationOptions: {
                parseXML,
                serializerOptions: {
                    xml: {
                        // Use customized XML char key of "#" so we can deserialize metadata
                        // with "_" key
                        xmlCharKey: "#",
                    },
                },
            } }));
        corePipeline.removePolicy({ phase: "Retry" });
        corePipeline.removePolicy({ name: decompressResponsePolicyName });
        corePipeline.addPolicy(storageCorrectContentLengthPolicy());
        corePipeline.addPolicy(storageRetryPolicy(restOptions.retryOptions), { phase: "Retry" });
        corePipeline.addPolicy(storageBrowserPolicy());
        const downlevelResults = processDownlevelPipeline(pipeline);
        if (downlevelResults) {
            corePipeline.addPolicy(downlevelResults.wrappedPolicies, downlevelResults.afterRetry ? { afterPhase: "Retry" } : undefined);
        }
        const credential = getCredentialFromPipeline(pipeline);
        if (isTokenCredential(credential)) {
            corePipeline.addPolicy(bearerTokenAuthenticationPolicy({
                credential,
                scopes: (_a = restOptions.audience) !== null && _a !== void 0 ? _a : StorageOAuthScopes,
                challengeCallbacks: { authorizeRequestOnChallenge: authorizeRequestOnTenantChallenge },
            }), { phase: "Sign" });
        }
        else if (credential instanceof StorageSharedKeyCredential) {
            corePipeline.addPolicy(storageSharedKeyCredentialPolicy({
                accountName: credential.accountName,
                accountKey: credential.accountKey,
            }), { phase: "Sign" });
        }
        pipeline._corePipeline = corePipeline;
    }
    return Object.assign(Object.assign({}, restOptions), { allowInsecureConnection: true, httpClient, pipeline: corePipeline });
}
export function getCredentialFromPipeline(pipeline) {
    // see if we squirreled one away on the type itself
    if (pipeline._credential) {
        return pipeline._credential;
    }
    // if it came from another package, loop over the factories and look for one like before
    let credential = new AnonymousCredential();
    for (const factory of pipeline.factories) {
        if (isTokenCredential(factory.credential)) {
            // Only works if the factory has been attached a "credential" property.
            // We do that in newPipeline() when using TokenCredential.
            credential = factory.credential;
        }
        else if (isStorageSharedKeyCredential(factory)) {
            return factory;
        }
    }
    return credential;
}
function isStorageSharedKeyCredential(factory) {
    if (factory instanceof StorageSharedKeyCredential) {
        return true;
    }
    return factory.constructor.name === "StorageSharedKeyCredential";
}
function isAnonymousCredential(factory) {
    if (factory instanceof AnonymousCredential) {
        return true;
    }
    return factory.constructor.name === "AnonymousCredential";
}
function isCoreHttpBearerTokenFactory(factory) {
    return isTokenCredential(factory.credential);
}
function isStorageBrowserPolicyFactory(factory) {
    if (factory instanceof StorageBrowserPolicyFactory) {
        return true;
    }
    return factory.constructor.name === "StorageBrowserPolicyFactory";
}
function isStorageRetryPolicyFactory(factory) {
    if (factory instanceof StorageRetryPolicyFactory) {
        return true;
    }
    return factory.constructor.name === "StorageRetryPolicyFactory";
}
function isStorageTelemetryPolicyFactory(factory) {
    return factory.constructor.name === "TelemetryPolicyFactory";
}
function isInjectorPolicyFactory(factory) {
    return factory.constructor.name === "InjectorPolicyFactory";
}
function isCoreHttpPolicyFactory(factory) {
    const knownPolicies = [
        "GenerateClientRequestIdPolicy",
        "TracingPolicy",
        "LogPolicy",
        "ProxyPolicy",
        "DisableResponseDecompressionPolicy",
        "KeepAlivePolicy",
        "DeserializationPolicy",
    ];
    const mockHttpClient = {
        sendRequest: async (request) => {
            return {
                request,
                headers: request.headers.clone(),
                status: 500,
            };
        },
    };
    const mockRequestPolicyOptions = {
        log(_logLevel, _message) {
            /* do nothing */
        },
        shouldLog(_logLevel) {
            return false;
        },
    };
    const policyInstance = factory.create(mockHttpClient, mockRequestPolicyOptions);
    const policyName = policyInstance.constructor.name;
    // bundlers sometimes add a custom suffix to the class name to make it unique
    return knownPolicies.some((knownPolicyName) => {
        return policyName.startsWith(knownPolicyName);
    });
}
//# sourceMappingURL=Pipeline.js.map