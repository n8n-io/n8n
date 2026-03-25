import { SigninClientConfig } from "@aws-sdk/nested-clients/signin";
import { CredentialProviderOptions } from "@aws-sdk/types";
import { SharedConfigInit } from "@smithy/shared-ini-file-loader";
export interface FromLoginCredentialsInit
  extends CredentialProviderOptions,
    SharedConfigInit {
  profile?: string;
  clientConfig?: SigninClientConfig;
}
export interface LoginToken {
  accessToken: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    accountId?: string;
    expiresAt: string;
  };
  tokenType: string;
  clientId: string;
  refreshToken: string;
  idToken: string;
  dpopKey: string;
}
export interface DpopHeader {
  typ: "dpop+jwt";
  alg: "ES256";
  jwk: {
    kty: "EC";
    crv: "P-256";
    x: string;
    y: string;
  };
}
export interface DpopPayload {
  jti: string;
  htm: string;
  htu: string;
  iat: number;
}
