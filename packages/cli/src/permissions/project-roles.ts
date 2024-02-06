import type { Scope } from '@n8n/permissions';

export const PROJECT_ADMIN_SCOPES: Scope[] = [];

export const PROJECT_EDITOR_SCOPES: Scope[] = [];

export const PROJECT_VIEWER_SCOPES: Scope[] = [];

/**
 * You can be an admin of your personal project and have different roles in other projects.
 *
 * Diff between admin in personal project and admin in other projects:
 * - You cannot rename your personal project.
 * - You cannot invite people to your personal project.
 */
