import type { AwsIdentityProperties } from "@aws-sdk/types";
import type { SSOToken } from "@smithy/shared-ini-file-loader";
import type { FromSsoInit } from "./fromSso";
/**
 * Returns a new SSO OIDC token from SSOOIDC::createToken() API call.
 * @internal
 */
export declare const getNewSsoOidcToken: (ssoToken: SSOToken, ssoRegion: string, init?: FromSsoInit, callerClientConfig?: AwsIdentityProperties["callerClientConfig"]) => Promise<import("@aws-sdk/nested-clients/sso-oidc").CreateTokenCommandOutput>;
