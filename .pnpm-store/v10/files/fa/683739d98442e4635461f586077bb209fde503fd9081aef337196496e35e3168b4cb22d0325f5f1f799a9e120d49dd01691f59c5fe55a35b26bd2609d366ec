export const getSsoOidcClient = async (ssoRegion, init = {}) => {
    const { SSOOIDCClient } = await import("@aws-sdk/nested-clients/sso-oidc");
    const ssoOidcClient = new SSOOIDCClient(Object.assign({}, init.clientConfig ?? {}, {
        region: ssoRegion ?? init.clientConfig?.region,
        logger: init.clientConfig?.logger ?? init.parentClientConfig?.logger,
    }));
    return ssoOidcClient;
};
