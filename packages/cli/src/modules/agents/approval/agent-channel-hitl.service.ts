import type {
	AgentHitlChannelConfiguration,
	AgentHitlChannelDescriptor,
	AgentHitlOptionsQuery,
	AgentIntegrationConfig,
} from '@n8n/api-types';
import { AGENT_DECISION_TRIGGER_NODE_TYPE } from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { UserError, type IWorkflowBase } from 'n8n-workflow';
import { NotFoundError } from '@n8n/errors';
import { AgentHitlWorkflowRepository } from '../repositories/agent-hitl-workflow.repository';
import { AgentRepository } from '../repositories/agent.repository';
import { ChatIntegrationRegistry } from '../integrations/agent-chat-integration';
import { AgentCredentialLookupService } from '../integrations/agent-credential-lookup.service';

@Service()
export class AgentChannelHitlService {
	constructor(
		private readonly agents: AgentRepository,
		private readonly registry: ChatIntegrationRegistry,
		private readonly credentials: AgentCredentialLookupService,
		private readonly outboundHttp: OutboundHttp,
	) {}

	async listChannels(
		user: User,
		projectId: string,
		agentId: string,
	): Promise<AgentHitlChannelDescriptor[]> {
		const agent = await this.agents.findByIdAndProjectId(agentId, projectId);
		if (!agent) throw new NotFoundError('Agent not found');
		const channels: AgentHitlChannelDescriptor[] = [];
		for (const integration of agent.integrations ?? []) {
			if (
				integration.type !== 'slack' &&
				integration.type !== 'telegram' &&
				integration.type !== 'discord'
			)
				continue;
			const platform = this.registry.require(integration.type);
			if (!platform.hitl.supported || !integration.credentialId) continue;
			if (
				!(await this.credentials.decryptForUser(
					user,
					projectId,
					integration.credentialId,
					platform.credentialTypes[0],
				))
			)
				continue;
			channels.push({
				channel: integration.type,
				credentialId: integration.credentialId,
				label: platform.displayLabel,
				fields: platform.hitl.fields,
			});
		}
		return channels;
	}

	async listOptions(user: User, projectId: string, agentId: string, query: AgentHitlOptionsQuery) {
		const agent = await this.agents.findByIdAndProjectId(agentId, projectId);
		if (!agent) throw new NotFoundError('Agent not found');
		this.requireConnection(query.channel, query.credentialId, agent.integrations ?? []);
		const platform = this.registry.require(query.channel);
		if (!platform.hitl.supported)
			throw new UserError('This channel does not support approval requests');
		const credential = await this.credentials.decryptForUser(
			user,
			projectId,
			query.credentialId,
			platform.credentialTypes[0],
		);
		if (!credential) throw new UserError('The channel credential is unavailable');
		return await platform.hitl.listOptions({
			credential,
			query,
			httpClient: this.outboundHttp.requests({ useDefaultSsrfPolicy: 'unsafe' }),
		});
	}

	async prepareWorkflow(
		configuration: AgentHitlChannelConfiguration,
		integrations: AgentIntegrationConfig[],
		projectId: string,
		agentId: string,
		callerWorkflowId?: string,
	): Promise<IWorkflowBase> {
		this.requireConnection(configuration.channel, configuration.credentialId, integrations);
		const ownerId =
			callerWorkflowId ??
			(await Container.get(AgentHitlWorkflowRepository).ensureExecutionOwner(projectId, agentId));
		return this.buildWorkflow(configuration, integrations, ownerId);
	}

	buildWorkflow(
		configuration: AgentHitlChannelConfiguration,
		integrations: AgentIntegrationConfig[],
		callerWorkflowId: string,
	): IWorkflowBase {
		this.requireConnection(configuration.channel, configuration.credentialId, integrations);
		const platform = this.registry.require(configuration.channel);
		if (!platform.hitl.supported)
			throw new UserError('This channel does not support approval requests');
		const node = platform.hitl.createNode(configuration);
		const now = new Date();
		// Keep the generated child under its caller. The execution stores its own node snapshot.
		return {
			id: callerWorkflowId,
			name: configuration.name,
			active: false,
			activeVersionId: null,
			isArchived: false,
			createdAt: now,
			updatedAt: now,
			nodes: [
				{
					id: 'agent-decision-trigger',
					name: 'Agent decision',
					type: AGENT_DECISION_TRIGGER_NODE_TYPE,
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				node,
			],
			connections: { 'Agent decision': { main: [[{ node: node.name, type: 'main', index: 0 }]] } },
			settings: {
				callerPolicy: 'any',
				saveDataSuccessExecution: 'all',
				saveDataErrorExecution: 'all',
			},
		};
	}

	private requireConnection(
		channel: string,
		credentialId: string,
		integrations: AgentIntegrationConfig[],
	) {
		if (
			!integrations.some(
				(integration) => integration.type === channel && integration.credentialId === credentialId,
			)
		)
			throw new UserError('The approval channel is no longer connected to this Agent');
	}
}
