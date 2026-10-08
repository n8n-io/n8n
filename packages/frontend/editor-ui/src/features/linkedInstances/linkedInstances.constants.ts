import type { Scope } from '@n8n/permissions';

/** The backend module name. The shell shows the page only while this module is active. */
export const LINKED_INSTANCES_MODULE_ID = 'linked-instances';

export const LINKED_INSTANCES_SETTINGS_VIEW = 'LinkedInstancesSettings';

/** The backend routes require this scope, so the page and the sidebar item require it too. */
export const LINKED_INSTANCES_SCOPE: Scope = 'instanceAi:message';
