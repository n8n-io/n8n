import type { CredentialProvider } from '@n8n/agents';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	instanceAiBuilderThreadPrefix,
	type InstanceAiBuilderDelegate,
	type InstanceAiCredentialService,
} from '@n8n/instance-ai';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { AgentContextService } from '@/modules/agents/agent-context.service';
import { AgentDraftService } from '@/modules/agents/agent-draft.service';
import { AgentsBuilderService } from '@/modules/agents/builder/agents-builder.service';
import { runInBuilderTelemetrySession } from '@/modules/agents/builder/builder-session';
import { Telemetry } from '@/telemetry';

@Service()
export class InstanceAiBuilderDelegateAdapterService {
	constructor(
		private readonly builder: AgentsBuilderService,
		private readonly drafts: AgentDraftService,
		private readonly context: AgentContextService,
		private readonly telemetry: Telemetry,
	) {}

	createDelegate(
		user: User,
		projectId: string,
		credentialProviderFor: (agentId: string) => CredentialProvider,
		credentialService: InstanceAiCredentialService,
		options: { useEvalModelCatalog?: boolean } = {},
	): InstanceAiBuilderDelegate {
		return {
			createAgent: async (name, { session, ...createOptions } = {}) =>
				await runInBuilderTelemetrySession(
					session,
					async () =>
						await this.drafts.createDraft(user, projectId, name, {
							...createOptions,
							createdBy: 'builder',
						}),
				),
			getBuilderTools: (resolveTargetAgentId, session) =>
				this.builder.getTools(
					user,
					projectId,
					resolveTargetAgentId,
					credentialProviderFor,
					credentialService,
					{
						...(options.useEvalModelCatalog ? { useEvalModelCatalog: true } : {}),
						session,
						track: (entry, properties) =>
							this.telemetry.track(entry, {
								thread_id: session.threadId,
								run_id: session.runId,
								...properties,
							}),
					},
				),
			getRuntimeSkills: () => this.builder.getRuntimeSkills(),
			getBuilderSessionContext: async (agentId) =>
				await this.builder.getSessionContext(user, projectId, agentId),
			resolveAgentName: async (agentId) =>
				await this.context.resolveAgentName(user, projectId, agentId),
			readAgentArtifact: async (agentId) =>
				await this.context.readArtifact(user, projectId, agentId),
			validateAgent: async (agentId) =>
				await this.builder.validateAgent(user, projectId, agentId, credentialProviderFor),
			getCredentialDefaults: async (agentId) =>
				await this.builder.getCredentialDefaults(user, projectId, agentId),
			trackCredentialRequest: (agentId, session, { credentialType, outcome }) => {
				const properties = {
					agent_id: agentId,
					user_id: user.id,
					thread_id: session.threadId,
					run_id: session.runId,
					credential_type: credentialType,
				};
				if (outcome === 'requested') {
					this.telemetry.track(TELEMETRY_EVENT.AGENTS.BUILDER_REQUESTED_CREDENTIAL, properties);
					return;
				}
				this.telemetry.track(TELEMETRY_EVENT.AGENTS.USER_PROVIDED_CREDENTIAL, {
					...properties,
					outcome,
				});
			},
		};
	}

	async deleteBuilderSessions(instanceAiThreadId: string): Promise<void> {
		await this.builder.deleteBuilderSessions(instanceAiBuilderThreadPrefix(instanceAiThreadId));
	}
}
