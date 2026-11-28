import type { MessageBoxConfirmResult } from '@n8n/design-system';

export const CUSTOM_ROLES_DOCS_URL = 'https://docs.n8n.io/user-management/rbac/custom-roles/';

/** The result of `useMessage().confirm()` when the user confirms. */
export const MODAL_CONFIRM = 'confirm' satisfies MessageBoxConfirmResult;

/**
 * The id of the element in the shell that holds the modals (`AppModals.vue`). The dialogs of this
 * module attach to it, so that they stack with the modals of the shell.
 */
export const APP_MODALS_ELEMENT_ID = 'app-modals';
