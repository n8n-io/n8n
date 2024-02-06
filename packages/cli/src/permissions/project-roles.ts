import type { Scope } from '@n8n/permissions';

export const REGULAR_PROJECT_ADMIN_SCOPES: Scope[] = [];

export const PERSONAL_PROJECT_ADMIN_SCOPES: Scope[] = [];

export const PROJECT_EDITOR_SCOPES: Scope[] = [];

export const PROJECT_VIEWER_SCOPES: Scope[] = [];

/**
 * Diff between admin in personal project and admin in other projects:
 * - You cannot rename your personal project.
 * - You cannot invite people to your personal project.
 */
