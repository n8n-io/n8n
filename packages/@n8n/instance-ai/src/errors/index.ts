// A light entry point for callers that need only the error classes, without the
// rest of the package behind the root barrel.
export { FolderResolutionError } from './folder-resolution.error';
export { WorkflowEditorLockedError } from './workflow-editor-locked.error';
export { WorkflowNotFoundError } from './workflow-not-found.error';
export { WorkflowSaveConflictError } from './workflow-save-conflict.error';
