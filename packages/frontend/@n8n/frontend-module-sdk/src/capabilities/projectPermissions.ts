import { declareCapability } from '../declareCapability';
import type { ProjectPermissions } from '../types/capability';

/**
 * Reads the user's scopes for a project. The project list and the source control
 * state live in shell stores, which a module cannot reach.
 *
 * Provided by the shell in `capabilities.manifest.ts`.
 */
export const projectPermissions = declareCapability<ProjectPermissions>('project-permissions');
