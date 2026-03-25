export const getSsoOidcClient = async (ssoRegion, init = {}) => {
    const { SSOOIDCClient } = await import("@aws-sdk/nested-clients/sso-oidc");
    const coalesce = (prop) => init.clientConfig?.[prop] ?? init.parentClientConfig?.[prop];
    const ssoOidcClient = new SSOOIDCClient(Object.assign({}, init.clientConfig ?? {}, {
        region: ssoRegion ?? init.clientConfig?.region,
        logger: coalesce("logger"),
        userAgentAppId: coalesce("userAgentAppId"),
    }));
    return ssoOidcClient;
};
