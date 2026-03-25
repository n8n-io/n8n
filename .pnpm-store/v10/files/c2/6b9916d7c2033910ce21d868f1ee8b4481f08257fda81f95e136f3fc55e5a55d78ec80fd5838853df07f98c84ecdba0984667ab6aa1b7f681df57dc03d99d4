"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromTemporaryCredentials = void 0;
const core_1 = require("@smithy/core");
const property_provider_1 = require("@smithy/property-provider");
const ASSUME_ROLE_DEFAULT_REGION = "us-east-1";
const fromTemporaryCredentials = (options, credentialDefaultProvider, regionProvider) => {
    let stsClient;
    return async (awsIdentityProperties = {}) => {
        const { callerClientConfig } = awsIdentityProperties;
        const profile = options.clientConfig?.profile ?? callerClientConfig?.profile;
        const logger = options.logger ?? callerClientConfig?.logger;
        logger?.debug("@aws-sdk/credential-providers - fromTemporaryCredentials (STS)");
        const params = { ...options.params, RoleSessionName: options.params.RoleSessionName ?? "aws-sdk-js-" + Date.now() };
        if (params?.SerialNumber) {
            if (!options.mfaCodeProvider) {
                throw new property_provider_1.CredentialsProviderError(`Temporary credential requires multi-factor authentication, but no MFA code callback was provided.`, {
                    tryNextLink: false,
                    logger,
                });
            }
            params.TokenCode = await options.mfaCodeProvider(params?.SerialNumber);
        }
        const { AssumeRoleCommand, STSClient } = await Promise.resolve().then(() => __importStar(require("./loadSts")));
        if (!stsClient) {
            const defaultCredentialsOrError = typeof credentialDefaultProvider === "function" ? credentialDefaultProvider() : undefined;
            const credentialSources = [
                options.masterCredentials,
                options.clientConfig?.credentials,
                void callerClientConfig?.credentials,
                callerClientConfig?.credentialDefaultProvider?.(),
                defaultCredentialsOrError,
            ];
            let credentialSource = "STS client default credentials";
            if (credentialSources[0]) {
                credentialSource = "options.masterCredentials";
            }
            else if (credentialSources[1]) {
                credentialSource = "options.clientConfig.credentials";
            }
            else if (credentialSources[2]) {
                credentialSource = "caller client's credentials";
                throw new Error("fromTemporaryCredentials recursion in callerClientConfig.credentials");
            }
            else if (credentialSources[3]) {
                credentialSource = "caller client's credentialDefaultProvider";
            }
            else if (credentialSources[4]) {
                credentialSource = "AWS SDK default credentials";
            }
            const regionSources = [
                options.clientConfig?.region,
                callerClientConfig?.region,
                await regionProvider?.({
                    profile,
                }),
                ASSUME_ROLE_DEFAULT_REGION,
            ];
            let regionSource = "default partition's default region";
            if (regionSources[0]) {
                regionSource = "options.clientConfig.region";
            }
            else if (regionSources[1]) {
                regionSource = "caller client's region";
            }
            else if (regionSources[2]) {
                regionSource = "file or env region";
            }
            const requestHandlerSources = [
                filterRequestHandler(options.clientConfig?.requestHandler),
                filterRequestHandler(callerClientConfig?.requestHandler),
            ];
            let requestHandlerSource = "STS default requestHandler";
            if (requestHandlerSources[0]) {
                requestHandlerSource = "options.clientConfig.requestHandler";
            }
            else if (requestHandlerSources[1]) {
                requestHandlerSource = "caller client's requestHandler";
            }
            logger?.debug?.(`@aws-sdk/credential-providers - fromTemporaryCredentials STS client init with ` +
                `${regionSource}=${await (0, core_1.normalizeProvider)(coalesce(regionSources))()}, ${credentialSource}, ${requestHandlerSource}.`);
            stsClient = new STSClient({
                ...options.clientConfig,
                credentials: coalesce(credentialSources),
                logger,
                profile,
                region: coalesce(regionSources),
                requestHandler: coalesce(requestHandlerSources),
            });
        }
        if (options.clientPlugins) {
            for (const plugin of options.clientPlugins) {
                stsClient.middlewareStack.use(plugin);
            }
        }
        const { Credentials } = await stsClient.send(new AssumeRoleCommand(params));
        if (!Credentials || !Credentials.AccessKeyId || !Credentials.SecretAccessKey) {
            throw new property_provider_1.CredentialsProviderError(`Invalid response from STS.assumeRole call with role ${params.RoleArn}`, {
                logger,
            });
        }
        return {
            accessKeyId: Credentials.AccessKeyId,
            secretAccessKey: Credentials.SecretAccessKey,
            sessionToken: Credentials.SessionToken,
            expiration: Credentials.Expiration,
            credentialScope: Credentials.CredentialScope,
        };
    };
};
exports.fromTemporaryCredentials = fromTemporaryCredentials;
const filterRequestHandler = (requestHandler) => {
    return requestHandler?.metadata?.handlerProtocol === "h2" ? undefined : requestHandler;
};
const coalesce = (args) => {
    for (const item of args) {
        if (item !== undefined) {
            return item;
        }
    }
};
