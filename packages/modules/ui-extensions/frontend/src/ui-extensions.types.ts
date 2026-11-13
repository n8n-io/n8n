import type { UiExtensionView } from '@n8n/api-types';

/** A tab of the side panel. `builtin` marks a view that ships with n8n. */
export type SidePanelView = UiExtensionView & { builtin: boolean };

/** The view runtime bundle that the shell passes in, as strings. */
export type ViewRuntimeAssets = { js: string; css: string };
