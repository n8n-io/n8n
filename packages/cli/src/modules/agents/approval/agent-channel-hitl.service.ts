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
import { isResourceLocatorValue, UserError, type IWorkflowBase } from 'n8n-workflow';
import { NotFoundError } from '@n8n/errors';
import {
	InstanceSettings,
	parseHitlCallbackReference,
	verifyHitlCallbackReference,
} from 'n8n-core';
import { isRecord } from '@n8n/utils/is-record';
import type { ActionEvent } from 'chat';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { AgentBackgroundJobRepository } from '../repositories/agent-background-job.repository';
import { hasApprovalExpired } from './approval-expiry';
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
		private readonly executions: ExecutionPersistence,
		private readonly jobs: AgentBackgroundJobRepository,
		private readonly instanceSettings: InstanceSettings,
	) {}

	async respond(
		agentId: string,
		projectId: string,
		integration: AgentIntegrationConfig,
		event: ActionEvent,
	): Promise<boolean | 'unavailable'> {
		const reference = parseHitlCallbackReference(event.actionId);
		if (
			!reference ||
			!verifyHitlCallbackReference(reference, this.instanceSettings.hmacSignatureSecret)
		)
			return 'unavailable';
		const execution = await this.executions.findSingleExecution(reference.executionId, {
			includeData: true,
			unflattenData: true,
		});
		const node = execution?.data.executionData?.nodeExecutionStack[0]?.node;
		const parent = execution?.data.parentAgentRun;
		const platform = this.registry.get(integration.type);
		if (
			!execution ||
			execution.status !== 'waiting' ||
			execution.data.waitReason === 'suspended' ||
			parent?.agentId !== agentId ||
			parent.projectId !== projectId ||
			!node ||
			node.parameters.agentApproval !== true ||
			node.type !== `n8n-nodes-base.${integration.type}` ||
			!platform?.hitl.supported ||
			!('credentialId' in integration) ||
			node.credentials?.[platform.credentialTypes[0]]?.id !== integration.credentialId
		)
			return 'unavailable';
		const job = await this.jobs.findWorkflowJobByExecutionId(reference.executionId);
		if (
			!job ||
			job.kind !== 'approval' ||
			job.parentAgentId !== agentId ||
			job.status !== 'running' ||
			hasApprovalExpired(job)
		)
			return 'unavailable';
		const userDestination =
			integration.type === 'telegram'
				? node.parameters.chatId
				: node.parameters.select === 'user'
					? node.parameters.user
					: node.parameters.sendTo === 'user'
						? node.parameters.userId
						: undefined;
		const userId = isResourceLocatorValue(userDestination)
			? userDestination.value
			: userDestination;
		if (userId !== undefined && userId !== event.user.userId) return 'unavailable';
		if (userId === undefined) {
			const destination = node.parameters.channelId;
			const thread = event.adapter.decodeThreadId(event.threadId);
			const channelId = isRecord(thread) ? (thread.channel ?? thread.channelId) : undefined;
			if (!isResourceLocatorValue(destination) || destination.value !== channelId)
				return 'unavailable';
		}
		const approved = reference.decision === 'a';
		const { WaitTracker } = await import('@/wait-tracker.js');
		try {
			await Container.get(WaitTracker).startExecution(reference.executionId, {
				nodeId: node.id,
				data: [
					{
						json: {
							data: {
								approved,
								respondedAt: new Date().toISOString(),
								responder: {
									id: event.user.userId,
									source: integration.type,
								},
							},
						},
					},
				],
			});
		} catch (error) {
			if (error instanceof ExecutionAlreadyResumingError) return 'unavailable';
			throw error;
		}
		return approved;
	}

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
