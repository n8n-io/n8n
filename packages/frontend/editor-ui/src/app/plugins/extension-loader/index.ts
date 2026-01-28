/**
 * Initialize extension points at app startup.
 *
 * Extension points are implicitly defined by <ExtensionPoint> components in the codebase.
 * No pre-definition is needed - just use <ExtensionPoint name="..." /> in your templates.
 *
 * Naming convention: {area}.{feature}.{position}
 * Examples:
 *   - views.workflows.headerBefore
 *   - views.workflows.headerAfter
 *   - views.workflows.tabs
 *   - views.workflow.sidebarTop
 *   - views.credentials.footer
 */
export type * from './types';
export * from './registry';
