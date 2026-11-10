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
import type { IWorkflowBase } from 'n8n-workflow';
import { NotFoundError, UserError } from '@n8n/errors';
import {
	InstanceSettings,
	parseHitlCallbackReference,
	verifyHitlCallbackReference,
} from 'n8n-core';
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
			reference.kind !== 'execution' ||
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
			!platform?.hitl.supported ||
			node.type !== platform.hitl.nodeType ||
			!('credentialId' in integration) ||
			node.credentials?.[platform.hitl.credentialType]?.id !== integration.credentialId
		)
			return 'unavailable';
		const job = await this.jobs.findWorkflowJobByExecutionId(reference.executionId);
		if (
			!job ||
			job.kind !== 'approval' ||
			job.parentAgentId !== agentId ||
			job.parentRunId !== parent.runId ||
			job.parentThreadId !== parent.threadId ||
			job.workflowId !== execution.workflowId ||
			job.status !== 'running' ||
			hasApprovalExpired(job)
		)
			return 'unavailable';
		if (!platform.hitl.matchesResponse(node, event)) return 'unavailable';

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
			const platform = this.registry.get(integration.type);
			if (
				!platform?.hitl.supported ||
				!('credentialId' in integration) ||
				!integration.credentialId
			)
				continue;
			if (
				!(await this.credentials.decryptForUser(
					user,
					projectId,
					integration.credentialId,
					platform.hitl.credentialType,
				))
			)
				continue;
			channels.push({
				channel: platform.hitl.channel,
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
			platform.hitl.credentialType,
		);
		if (!credential) throw new UserError('The channel credential is unavailable');
		return await platform.hitl.listOptions({
			credential,
			query,
			httpClient: this.outboundHttp.requests(),
		});
	}

	async prepareWorkflow(
		configuration: AgentHitlChannelConfiguration,
		integrations: AgentIntegrationConfig[],
		projectId: string,
		agentId: string,
	): Promise<IWorkflowBase> {
		this.requireConnection(configuration.channel, configuration.credentialId, integrations);
		const ownerId = await Container.get(AgentHitlWorkflowRepository).ensureExecutionOwner(
			projectId,
			agentId,
		);
		return this.buildWorkflow(configuration, integrations, ownerId);
	}

	buildWorkflow(
		configuration: AgentHitlChannelConfiguration,
		integrations: AgentIntegrationConfig[],
		ownerId: string,
	): IWorkflowBase {
		this.requireConnection(configuration.channel, configuration.credentialId, integrations);
		const platform = this.registry.require(configuration.channel);
		if (!platform.hitl.supported)
			throw new UserError('This channel does not support approval requests');
		const node = platform.hitl.createNode(configuration);
		const now = new Date();
		// The execution stores the generated graph. Its private owner has no editable graph.
		return {
			id: ownerId,
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
