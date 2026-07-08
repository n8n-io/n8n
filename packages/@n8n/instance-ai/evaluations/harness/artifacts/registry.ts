// ---------------------------------------------------------------------------
// Registry of all artifact handlers, keyed by ArtifactType.
// ---------------------------------------------------------------------------

import type { ArtifactHandler } from './types';
import { workflowHandler } from './workflow-handler';
import type { ArtifactType } from '../../types';

/** All registered artifact handlers. Agent + config-eval handlers are added in later steps. */
export const ARTIFACT_HANDLERS: ArtifactHandler[] = [workflowHandler];

/** Look up a handler by artifact type. Throws for an unregistered type. */
export function getHandler(type: ArtifactType): ArtifactHandler {
	const handler = ARTIFACT_HANDLERS.find((h) => h.type === type);
	if (!handler) throw new Error(`no artifact handler registered for type: ${type}`);
	return handler;
}
