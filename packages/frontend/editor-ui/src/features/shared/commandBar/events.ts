/**
 * Window CustomEvent dispatched by AppCommandBar when the command bar opens.
 * Any feature can subscribe to dismiss editor-local UI that would compete
 * with the command bar's focus or paint above it.
 */
export const COMMAND_BAR_OPEN_EVENT = 'n8n:command-bar:open';
