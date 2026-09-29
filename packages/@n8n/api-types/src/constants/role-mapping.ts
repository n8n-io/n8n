/**
 * Sentinel assignment value for SSO role mapping meaning "deny login instead
 * of assigning a role". Used in place of a role slug on mapping rules and on
 * the default condition (`defaultInstanceRole` in the provisioning config).
 *
 * Safe against collisions: real role slugs are always prefixed with their
 * role type (`global:*`, `project:*`), including custom roles.
 */
export const BLOCK_ACCESS_ASSIGNMENT = 'block:access';

/**
 * Query parameter the SSO callbacks add when redirecting a denied login back to
 * the sign-in page, so the UI can explain the denial instead of surfacing it as
 * a failed login.
 */
export const SSO_ERROR_QUERY_PARAM = 'ssoError';

export const SSO_ERROR_ACCESS_DENIED = 'access-denied';

export const SSO_ERROR_LOGIN_FAILED = 'login-failed';
