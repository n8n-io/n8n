import { Logger } from '@n8n/backend-common';
import { ProjectScopeService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';

import { AgentPublishService } from '@/modules/agents/agent-publish.service';
import { AgentsService } from '@/modules/agents/agents.service';

import type { AgentImportOutcome, PersistedAgentOutcome } from './agent-import.types';
import { blockedPublishingOutcome } from '../publishing';

@Service()
export class AgentPublisher {
	constructor(
		private readonly logger: Logger,
		private readonly projectScopeService: ProjectScopeService,
		private readonly publishService: AgentPublishService,
		private readonly agentsService: AgentsService,
	) {}

	async applyToPackage(
		user: User,
		persisted: PersistedAgentOutcome[],
	): Promise<AgentImportOutcome[]> {
		const outcomes: AgentImportOutcome[] = [];
		for (const outcome of persisted) {
			outcomes.push(await this.apply(user, outcome));
		}
		return outcomes;
	}

	private async apply(user: User, outcome: PersistedAgentOutcome): Promise<AgentImportOutcome> {
		const { status, sourceAgentId, agent } = outcome;
		const channels = outcome.status === 'skipped' ? [] : outcome.channels;
		const imported = { status, sourceAgentId, agent, channels };
		if (outcome.status === 'skipped' || outcome.publishingAction === 'noop') {
			return { ...imported, publishing: { state: 'unchanged' } };
		}

		const action = outcome.publishingAction;
		if (action === 'publish' && outcome.blockedFromPublish) {
			return {
				...imported,
				publishing: blockedPublishingOutcome(
					outcome.blockedFromPublish,
					Boolean(agent.activeVersionId),
				),
			};
		}

		try {
			const projectIds = await this.projectScopeService.getProjectIds(user, [`agent:${action}`]);
			if (projectIds !== null && !projectIds.includes(agent.projectId)) {
				throw new ForbiddenError(
					`You do not have permission to ${action} Agents in the destination project.`,
				);
			}

			if (action === 'publish') {
				const published = await this.publishService.publishAgent(
					agent.id,
					agent.projectId,
					user,
					{ by: 'user', trigger: 'explicit' },
					undefined,
					undefined,
					agent.revision,
				);
				return { ...imported, agent: published.agent, publishing: { state: 'published' } };
			}

			const unpublished = await this.publishService.unpublishAgent(
				agent.id,
				agent.projectId,
				user,
				'user',
				undefined,
				agent.revision,
			);
			return { ...imported, agent: unpublished, publishing: { state: 'unpublished' } };
		} catch (error) {
			const message = scrubSecretsInText(ensureError(error).message);
			this.logger.warn('Failed to apply publishing policy to imported Agent', {
				agentId: agent.id,
				action,
				error: message,
			});
			// Lifecycle effects can fail after the publication transaction commits.
			const current = await this.agentsService
				.findById(agent.id, agent.projectId)
				.catch(() => null);
			return {
				...imported,
				agent: current ?? agent,
				publishing: { state: 'failed', error: message },
			};
		}
	}
}
