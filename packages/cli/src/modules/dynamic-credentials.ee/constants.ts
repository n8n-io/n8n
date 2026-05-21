/**
 * Stable, well-known id of the system-managed N8N self-connect credential resolver
 * seeded by `N8nResolverSeeder` during module init. Downstream tickets (IAM-660 etc.)
 * reference this id from workflow settings and OAuth callbacks.
 */
export const SYSTEM_RESOLVER_ID = 'system-n8n';

/**
 * Human-readable name persisted on the seeded row and shown in the workflow-settings
 * resolver dropdown (where this is the default selection). Hidden from the admin
 * resolver list / types endpoints.
 */
export const SYSTEM_RESOLVER_NAME = 'n8n private credentials';

/** Type name of the N8N self-connect resolver class (matches its `metadata.name`). */
export const SYSTEM_RESOLVER_TYPE = 'credential-resolver.n8n-1.0';
