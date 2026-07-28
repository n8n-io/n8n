/**
 * Sentinel assignment value for SSO role mapping meaning "deny login instead
 * of assigning a role". Used in place of a role slug on mapping rules and on
 * the default condition (`defaultInstanceRole` in the provisioning config).
 *
 * Safe against collisions: real role slugs are always prefixed with their
 * role type (`global:*`, `project:*`), including custom roles.
 */
export const BLOCK_ACCESS_ASSIGNMENT = 'block:access';
