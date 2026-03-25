import { normalizeProvider } from "@smithy/core";
import { CredentialsProviderError } from "@smithy/property-provider";
const ASSUME_ROLE_DEFAULT_REGION = "us-east-1";
export const fromTemporaryCredentials = (options, credentialDefaultProvider, regionProvider) => {
    let stsClient;
    return async (awsIdentityProperties = {}) => {
        const { callerClientConfig } = awsIdentityProperties;
        const profile = options.clientConfig?.profile ?? callerClientConfig?.profile;
        const logger = options.logger ?? callerClientConfig?.logger;
        logger?.debug("@aws-sdk/credential-providers - fromTemporaryCredentials (STS)");
        const params = { ...options.params, RoleSessionName: options.params.RoleSessionName ?? "aws-sdk-js-" + Date.now() };
        if (params?.SerialNumber) {
            if (!options.mfaCodeProvider) {
                throw new CredentialsProviderError(`Temporary credential requires multi-factor authentication, but no MFA code callback was provided.`, {
                    tryNextLink: false,
                    logger,
                });
            }
            params.TokenCode = await options.mfaCodeProvider(params?.SerialNumber);
        }
        const { AssumeRoleCommand, STSClient } = await import("./loadSts");
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
                `${regionSource}=${await normalizeProvider(coalesce(regionSources))()}, ${credentialSource}, ${requestHandlerSource}.`);
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
            throw new CredentialsProviderError(`Invalid response from STS.assumeRole call with role ${params.RoleArn}`, {
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
