/**
 * Error code of the `POST /login` response when password sign-in is refused
 * because single sign-on (SAML or OIDC) is the active authentication method.
 * The sign-in page uses it to point the user to the SSO flow instead of
 * showing a generic login failure.
 */
export const SSO_LOGIN_REQUIRED_ERROR_CODE = 996;
