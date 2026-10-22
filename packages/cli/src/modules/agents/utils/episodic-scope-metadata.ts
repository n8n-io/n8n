import { encodeEpisodicScopeMetadata, type EpisodicScopeDecision } from '@n8n/agents';
import { isIntegrationMemoryResourceId } from './agent-memory-scope';

/**
 * The `hostMetadata` that fixes the episodic scope of a run. A run on an
 * integration resource without a resolved scope has no owner, so episodic
 * memory is off. Other runs keep their resource as scope and need no metadata.
 */
export function episodicScopeHostMetadata(
	resourceId: string,
	decision?: EpisodicScopeDecision,
): ReturnType<typeof encodeEpisodicScopeMetadata> {
	if (decision) return encodeEpisodicScopeMetadata(decision);
	return isIntegrationMemoryResourceId(resourceId)
		? encodeEpisodicScopeMetadata({ disabled: true })
		: {};
}
