/**
 * Boolean PostHog flag for the SCIM opt-in before general availability.
 * Evaluate it for the instance (`company`) group, because the SCIM routes need
 * one value for the whole instance.
 */
export const SCIM_OPT_IN_FLAG = '127_scim_provisioning';

/**
 * What turned the SCIM opt-in on: the `N8N_SCIM_OPT_IN` config switch or the
 * PostHog flag (which includes `N8N_FEATURE_FLAG_OVERRIDES`).
 */
export type ScimOptInSource = 'config' | 'flag';

/**
 * The n8n extension to the SCIM User resource. It carries the one value that
 * the core schema has no good home for: the instance role.
 */
export const SCIM_N8N_USER_SCHEMA = 'urn:n8n:params:scim:schemas:extension:1.0:User';
