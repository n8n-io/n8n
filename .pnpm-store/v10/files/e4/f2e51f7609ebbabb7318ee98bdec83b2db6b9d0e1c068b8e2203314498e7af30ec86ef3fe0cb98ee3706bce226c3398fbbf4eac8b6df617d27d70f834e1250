export interface AccessToken {
  accessKeyId: string | undefined;
  secretAccessKey: string | undefined;
  sessionToken: string | undefined;
}
export interface CreateOAuth2TokenRequestBody {
  clientId: string | undefined;
  grantType: string | undefined;
  code?: string | undefined;
  redirectUri?: string | undefined;
  codeVerifier?: string | undefined;
  refreshToken?: string | undefined;
}
export interface CreateOAuth2TokenRequest {
  tokenInput: CreateOAuth2TokenRequestBody | undefined;
}
export interface CreateOAuth2TokenResponseBody {
  accessToken: AccessToken | undefined;
  tokenType: string | undefined;
  expiresIn: number | undefined;
  refreshToken: string | undefined;
  idToken?: string | undefined;
}
export interface CreateOAuth2TokenResponse {
  tokenOutput: CreateOAuth2TokenResponseBody | undefined;
}
