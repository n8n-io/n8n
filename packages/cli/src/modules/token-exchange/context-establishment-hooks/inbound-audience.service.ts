import { Service } from '@n8n/di';
import type { INode, Workflow } from 'n8n-workflow';

import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';

export type ExpectedAudienceResult =
	| { audiences: string[]; reason?: undefined }
	| { audiences?: undefined; reason: 'resource_not_found' };

/**
 * Single source of truth for the audience(s) external tokens must target to
 * be accepted at context establishment. Kept separate from
 * `InboundClaimVerificationHook` so this decision is independently testable
 * and swappable without touching the hook.
 *
 * Audience belongs to the resource being called (e.g. a specific webhook or
 * MCP trigger), not to the trust source that signed the token - so this
 * resolves per-`(workflow, triggerNode)` via `ProtectedResourceRegistry`
 * rather than returning one fixed, instance-wide value. When no resource can
 * be resolved (e.g. a trigger type no resolver covers, or the resolvers'
 * owning module is disabled), this fails closed: there is no instance-wide
 * fallback to guess an audience from.
 */
@Service()
export class InboundAudienceService {
	constructor(private readonly protectedResourceRegistry: ProtectedResourceRegistry) {}

	async getExpectedAudiences(
		workflow: Workflow,
		triggerNode: INode,
	): Promise<ExpectedAudienceResult> {
		const resource = await this.protectedResourceRegistry.getByWorkflowNode(workflow, triggerNode);
		if (!resource) {
			return { reason: 'resource_not_found' };
		}
		return { audiences: resource.getAudiences() };
	}
}
