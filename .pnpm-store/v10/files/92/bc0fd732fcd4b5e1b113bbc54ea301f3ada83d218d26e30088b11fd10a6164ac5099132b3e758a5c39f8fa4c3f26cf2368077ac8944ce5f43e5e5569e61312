import { setCredentialFeature } from "@aws-sdk/core/client";
import { doesIdentityRequireRefresh, isIdentityExpired, memoizeIdentityProvider, normalizeProvider, } from "@smithy/core";
import { SignatureV4 } from "@smithy/signature-v4";
export const resolveAwsSdkSigV4Config = (config) => {
    let inputCredentials = config.credentials;
    let isUserSupplied = !!config.credentials;
    let resolvedCredentials = undefined;
    Object.defineProperty(config, "credentials", {
        set(credentials) {
            if (credentials && credentials !== inputCredentials && credentials !== resolvedCredentials) {
                isUserSupplied = true;
            }
            inputCredentials = credentials;
            const memoizedProvider = normalizeCredentialProvider(config, {
                credentials: inputCredentials,
                credentialDefaultProvider: config.credentialDefaultProvider,
            });
            const boundProvider = bindCallerConfig(config, memoizedProvider);
            if (isUserSupplied && !boundProvider.attributed) {
                const isCredentialObject = typeof inputCredentials === "object" && inputCredentials !== null;
                resolvedCredentials = async (options) => {
                    const creds = await boundProvider(options);
                    const attributedCreds = creds;
                    if (isCredentialObject && (!attributedCreds.$source || Object.keys(attributedCreds.$source).length === 0)) {
                        return setCredentialFeature(attributedCreds, "CREDENTIALS_CODE", "e");
                    }
                    return attributedCreds;
                };
                resolvedCredentials.memoized = boundProvider.memoized;
                resolvedCredentials.configBound = boundProvider.configBound;
                resolvedCredentials.attributed = true;
            }
            else {
                resolvedCredentials = boundProvider;
            }
        },
        get() {
            return resolvedCredentials;
        },
        enumerable: true,
        configurable: true,
    });
    config.credentials = inputCredentials;
    const { signingEscapePath = true, systemClockOffset = config.systemClockOffset || 0, sha256, } = config;
    let signer;
    if (config.signer) {
        signer = normalizeProvider(config.signer);
    }
    else if (config.regionInfoProvider) {
        signer = () => normalizeProvider(config.region)()
            .then(async (region) => [
            (await config.regionInfoProvider(region, {
                useFipsEndpoint: await config.useFipsEndpoint(),
                useDualstackEndpoint: await config.useDualstackEndpoint(),
            })) || {},
            region,
        ])
            .then(([regionInfo, region]) => {
            const { signingRegion, signingService } = regionInfo;
            config.signingRegion = config.signingRegion || signingRegion || region;
            config.signingName = config.signingName || signingService || config.serviceId;
            const params = {
                ...config,
                credentials: config.credentials,
                region: config.signingRegion,
                service: config.signingName,
                sha256,
                uriEscapePath: signingEscapePath,
            };
            const SignerCtor = config.signerConstructor || SignatureV4;
            return new SignerCtor(params);
        });
    }
    else {
        signer = async (authScheme) => {
            authScheme = Object.assign({}, {
                name: "sigv4",
                signingName: config.signingName || config.defaultSigningName,
                signingRegion: await normalizeProvider(config.region)(),
                properties: {},
            }, authScheme);
            const signingRegion = authScheme.signingRegion;
            const signingService = authScheme.signingName;
            config.signingRegion = config.signingRegion || signingRegion;
            config.signingName = config.signingName || signingService || config.serviceId;
            const params = {
                ...config,
                credentials: config.credentials,
                region: config.signingRegion,
                service: config.signingName,
                sha256,
                uriEscapePath: signingEscapePath,
            };
            const SignerCtor = config.signerConstructor || SignatureV4;
            return new SignerCtor(params);
        };
    }
    const resolvedConfig = Object.assign(config, {
        systemClockOffset,
        signingEscapePath,
        signer,
    });
    return resolvedConfig;
};
export const resolveAWSSDKSigV4Config = resolveAwsSdkSigV4Config;
function normalizeCredentialProvider(config, { credentials, credentialDefaultProvider, }) {
    let credentialsProvider;
    if (credentials) {
        if (!credentials?.memoized) {
            credentialsProvider = memoizeIdentityProvider(credentials, isIdentityExpired, doesIdentityRequireRefresh);
        }
        else {
            credentialsProvider = credentials;
        }
    }
    else {
        if (credentialDefaultProvider) {
            credentialsProvider = normalizeProvider(credentialDefaultProvider(Object.assign({}, config, {
                parentClientConfig: config,
            })));
        }
        else {
            credentialsProvider = async () => {
                throw new Error("@aws-sdk/core::resolveAwsSdkSigV4Config - `credentials` not provided and no credentialDefaultProvider was configured.");
            };
        }
    }
    credentialsProvider.memoized = true;
    return credentialsProvider;
}
function bindCallerConfig(config, credentialsProvider) {
    if (credentialsProvider.configBound) {
        return credentialsProvider;
    }
    const fn = async (options) => credentialsProvider({ ...options, callerClientConfig: config });
    fn.memoized = credentialsProvider.memoized;
    fn.configBound = true;
    return fn;
}
