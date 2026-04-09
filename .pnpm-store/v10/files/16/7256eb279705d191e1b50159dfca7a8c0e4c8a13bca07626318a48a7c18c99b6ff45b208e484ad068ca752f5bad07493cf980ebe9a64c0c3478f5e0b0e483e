import { getSsoOidcClient } from "./getSsoOidcClient";
export const getNewSsoOidcToken = async (ssoToken, ssoRegion, init = {}, callerClientConfig) => {
    const { CreateTokenCommand } = await import("@aws-sdk/nested-clients/sso-oidc");
    const ssoOidcClient = await getSsoOidcClient(ssoRegion, init, callerClientConfig);
    return ssoOidcClient.send(new CreateTokenCommand({
        clientId: ssoToken.clientId,
        clientSecret: ssoToken.clientSecret,
        refreshToken: ssoToken.refreshToken,
        grantType: "refresh_token",
    }));
};
