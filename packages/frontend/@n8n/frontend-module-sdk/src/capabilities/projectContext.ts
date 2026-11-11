import { declareCapability } from '../declareCapability';
import type { ProjectContext } from '../types/capability';

/**
 * Reads and reloads the project state of the shell. The projects store reaches
 * the credentials, workflows and source control stores, so it cannot move to an
 * L2 package.
 *
 * Provided by the shell in `capabilities.manifest.ts`.
 */
export const projectContext = declareCapability<ProjectContext>('project-context');
