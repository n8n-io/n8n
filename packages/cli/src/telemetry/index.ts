import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { GlobalConfig } from '@n8n/config';
import {
	ProjectRelationRepository,
	ProjectRepository,
	WorkflowRepository,
	UserRepository,
} from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type RudderStack from '@rudderstack/rudder-sdk-node';
import type { AxiosRequestConfig } from 'axios';
import { ErrorReporter, InstanceSettings } from 'n8n-core';
import type { ITelemetryTrackProperties } from 'n8n-workflow';

import { LOWEST_SHUTDOWN_PRIORITY, N8N_VERSION } from '@/constants';
import type {
	IAgentConfigurationTelemetryProperties,
	IAgentExecutionTrackProperties,
	IAgentTurnFinishedTrackProperties,
	IExecutionTrackProperties,
} from '@/interfaces';
import { License } from '@/license';
import { PostHogClient } from '@/posthog';

import { SourceControlPreferencesService } from '../modules/source-control.ee/source-control-preferences.service.ee';

type ExecutionTrackDataKey =
	| 'manual_error'
	| 'manual_success'
	| 'prod_error'
	| 'prod_success'
	| 'manual_crashed'
	| 'prod_crashed'
	| `${'instance_ai'}_${'mock' | 'real'}_${'manual' | 'prod'}_${'error' | 'success' | 'crashed'}`;

interface IExecutionTrackData {
	count: number;
	first: Date;
}

type IExecutionsBufferEntry = Partial<Record<ExecutionTrackDataKey, IExecutionTrackData>> & {
	user_id: string | undefined;
};

interface IExecutionsBuffer {
	[workflowId: string]: IExecutionsBufferEntry;
}

interface IApiInvocationProperties {
	user_id: string;
	path: string;
	method: string;
	api_version: string;
	user_agent?: string;
}

interface IApiInvocationsBufferEntry {
	total_calls: number;
	first: Date;
	endpoints: Record<string, number>;
	user_agents: Record<string, number>;
}

interface IApiInvocationsBuffer {
	[userId: string]: IApiInvocationsBufferEntry;
}

interface IAgentExecutionCountsBuffer {
	[bufferKey: string]: {
		agent_id: string;
		user_id?: string;
		message_count: number;
		token_count: number;
		tool_call_count: number;
	};
}

interface IAgentSessionMetrics {
	latency_ms: number;
	cost: number;
	tool_call_count: number;
	num_skills: number;
	turn_count: number;
}

interface IAgentSessionMetricsBuffer {
	[bufferKey: string]: {
		agent_id: string;
		run_type: IAgentTurnFinishedTrackProperties['run_type'];
		turn_status: IAgentTurnFinishedTrackProperties['turn_status'];
		configuration: IAgentConfigurationTelemetryProperties;
		sessions: Record<string, IAgentSessionMetrics>;
	};
}

@Service()
export class Telemetry {
	private rudderStack?: RudderStack;

	private pulseIntervalReference: NodeJS.Timeout;

	private executionCountsBuffer: IExecutionsBuffer = {};

	private apiInvocationsBuffer: IApiInvocationsBuffer = {};

	private agentExecutionCountsBuffer: IAgentExecutionCountsBuffer = {};

	private agentSessionMetricsBuffer: IAgentSessionMetricsBuffer = {};

	constructor(
		private readonly logger: Logger,
		private readonly postHog: PostHogClient,
		private readonly license: License,
		private readonly instanceSettings: InstanceSettings,
		private readonly workflowRepository: WorkflowRepository,
		private readonly globalConfig: GlobalConfig,
		private readonly errorReporter: ErrorReporter,
		private readonly outboundHttp: OutboundHttp,
	) {}

	// PostHog groupIdentify only accepts flat objects with string or number values, function sanitizes objects to match that format.
	sanitizeTelemetryProperties(
		obj: Record<string, any>,
		depth = 0,
		maxDepth = 10,
	): Record<string, string | number> {
		try {
			const result: Record<string, string | number> = {};

			for (const [key, value] of Object.entries(obj)) {
				if (value === null || value === undefined) {
					continue;
				} else if (typeof value === 'boolean') {
					result[key] = value ? 'true' : 'false';
				} else if (typeof value === 'number') {
					result[key] = value;
				} else if (typeof value === 'string') {
					result[key] = value;
				} else if (Array.isArray(value)) {
					result[key] = JSON.stringify(value);
				} else if (typeof value === 'object' && value.constructor === Object) {
					if (depth >= maxDepth) {
						result[key] = JSON.stringify(value);
					} else {
						// Recursively flatten nested objects
						Object.assign(
							result,
							this.sanitizeTelemetryProperties(
								value as Record<string, unknown>,
								depth + 1,
								maxDepth,
							),
						);
					}
				} else {
					continue;
				}
			}

			return result;
		} catch (e) {
			this.logger.error('Error sanitizing telemetry properties', { error: e, object: obj });
			return {};
		}
	}

	async init() {
		const { enabled, backendConfig } = this.globalConfig.diagnostics;
		if (enabled) {
			const [key, dataPlaneUrl] = backendConfig.split(';');

			if (!key || !dataPlaneUrl) {
				this.logger.warn('Diagnostics backend config is invalid');
				return;
			}

			const logLevel = this.globalConfig.logging.level;

			const { default: RudderStack } = await import('@rudderstack/rudder-sdk-node');

			const { httpAgent, httpsAgent } = this.outboundHttp
				.transport({
					ssrf: 'disabled', // The data-plane host is fixed and the SDK owns the request lifecycle, so SSRF is disabled.
				})
				.getNodeAgent();
			const axiosConfig: AxiosRequestConfig = {
				httpAgent,
				httpsAgent,
				headers: { 'Content-Type': 'application/json' },
			};

			this.rudderStack = new RudderStack(key, {
				axiosConfig,
				logLevel,
				dataPlaneUrl,
				gzip: false,
				errorHandler: (error) => {
					this.errorReporter.error(error);
				},
			});

			this.startPulse();
		}
	}

	private startPulse() {
		this.pulseIntervalReference = setInterval(
			async () => {
				void this.pulse();
			},
			6 * 60 * 60 * 1000,
		); // every 6 hours
	}

	private async pulse() {
		if (!this.rudderStack) {
			return;
		}

		this.flushWorkflowExecutionCounts();
		this.flushAgentExecutionCounts();
		this.flushAgentSessionMetrics();

		// Flush API invocation counts
		for (const userId of Object.keys(this.apiInvocationsBuffer)) {
			const entry = this.apiInvocationsBuffer[userId];
			if (entry.total_calls > 0) {
				this.track('Public API usage', {
					user_id: userId,
					total_calls: entry.total_calls,
					first: entry.first,
					endpoints: JSON.stringify(entry.endpoints),
					user_agents: JSON.stringify(entry.user_agents),
				});
			}
		}
		this.apiInvocationsBuffer = {};

		const sourceControlPreferences = Container.get(
			SourceControlPreferencesService,
		).getPreferences();

		// License info
		const pulsePacket = {
			plan_name_current: this.license.getPlanName(),
			quota: this.license.getTriggerLimit(),
			usage: await this.workflowRepository.getActiveTriggerCount(),
			role_count: await Container.get(UserRepository).countUsersByRole(),
			source_control_set_up: Container.get(SourceControlPreferencesService).isSourceControlSetup(),
			branchName: sourceControlPreferences.branchName,
			read_only_instance: sourceControlPreferences.branchReadOnly,
			team_projects: (await Container.get(ProjectRepository).getProjectCounts()).team,
			project_role_count: await Container.get(ProjectRelationRepository).countUsersByRole(),
		};

		this.track('pulse', pulsePacket);
	}

	private flushWorkflowExecutionCounts() {
		const workflowIdsToReport = Object.keys(this.executionCountsBuffer).filter((workflowId) => {
			const data = this.executionCountsBuffer[workflowId];
			const sum =
				(data.manual_error?.count ?? 0) +
				(data.manual_success?.count ?? 0) +
				(data.prod_error?.count ?? 0) +
				(data.prod_success?.count ?? 0) +
				(data.manual_crashed?.count ?? 0) +
				(data.prod_crashed?.count ?? 0);

			return sum > 0;
		});

		for (const workflowId of workflowIdsToReport) {
			this.track('Workflow execution count', {
				event_version: '2',
				workflow_id: workflowId,
				...this.executionCountsBuffer[workflowId],
			});
		}

		this.executionCountsBuffer = {};
	}

	private getAgentExecutionCountsBufferKey(agentId: string, userId?: string) {
		return userId ? `${agentId}:${userId}` : agentId;
	}

	private flushAgentExecutionCounts() {
		const keysToReport = Object.keys(this.agentExecutionCountsBuffer).filter((bufferKey) => {
			const data = this.agentExecutionCountsBuffer[bufferKey];
			return data.message_count + data.token_count + data.tool_call_count > 0;
		});

		for (const bufferKey of keysToReport) {
			// Agent-level aggregate window keyed by persisted agent ID plus optional n8n user ID.
			// A resume-only window may legitimately report tokens or tools with message_count = 0.
			const { agent_id, user_id, ...counts } = this.agentExecutionCountsBuffer[bufferKey];
			this.track('Agent execution count', {
				event_version: '1',
				agent_id,
				...(user_id ? { user_id } : {}),
				...counts,
			});
		}

		this.agentExecutionCountsBuffer = {};
	}

	private getAgentSessionMetricsBufferKey(properties: IAgentTurnFinishedTrackProperties) {
		return [
			properties.agent_id,
			properties.run_type,
			properties.turn_status,
			JSON.stringify(properties.configuration),
		].join(':');
	}

	private flushAgentSessionMetrics() {
		for (const bucket of Object.values(this.agentSessionMetricsBuffer)) {
			const sessions = Object.values(bucket.sessions);
			if (sessions.length === 0) continue;

			const latencyMsSum = sessions.reduce((total, session) => total + session.latency_ms, 0);
			const costSum = sessions.reduce((total, session) => total + session.cost, 0);
			const toolCallCountSum = sessions.reduce(
				(total, session) => total + session.tool_call_count,
				0,
			);
			const numSkillsSum = sessions.reduce((total, session) => total + session.num_skills, 0);
			const turnCount = sessions.reduce((total, session) => total + session.turn_count, 0);

			this.track('Agent session metrics', {
				event_version: '1',
				agent_id: bucket.agent_id,
				...bucket.configuration,
				run_type: bucket.run_type,
				turn_status: bucket.turn_status,
				session_count: sessions.length,
				turn_count: turnCount,
				latency_ms_sum: latencyMsSum,
				cost_sum: costSum,
				tool_call_count_sum: toolCallCountSum,
				num_skills_sum: numSkillsSum,
			});
		}

		this.agentSessionMetricsBuffer = {};
	}

	trackWorkflowExecution(properties: IExecutionTrackProperties) {
		if (this.rudderStack) {
			const execTime = new Date();
			const workflowId = properties.workflow_id;

			this.executionCountsBuffer[workflowId] = this.executionCountsBuffer[workflowId] ?? {
				user_id: properties.user_id,
			};

			let key: ExecutionTrackDataKey;
			if (properties.crashed) {
				key = `${properties.is_manual ? 'manual' : 'prod'}_crashed`;
			} else {
				key = `${properties.is_manual ? 'manual' : 'prod'}_${
					properties.success ? 'success' : 'error'
				}`;
			}

			this.addExecutionTrackData(workflowId, key, execTime);

			const executionStatus = properties.crashed
				? 'crashed'
				: properties.success
					? 'success'
					: 'error';
			const executionMode = properties.is_manual ? 'manual' : 'prod';

			if (properties.execution_source === 'instance_ai') {
				const instanceAiDataType = properties.mock_data_sources ? 'mock' : 'real';
				const sourceKey: ExecutionTrackDataKey = `instance_ai_${instanceAiDataType}_${executionMode}_${executionStatus}`;
				this.addExecutionTrackData(workflowId, sourceKey, execTime);
			}

			if (properties.used_private_credentials) {
				this.track('Workflow execution with private credentials', properties);
			}

			if (
				!properties.success &&
				properties.is_manual &&
				properties.error_node_type?.startsWith('n8n-nodes-base')
			) {
				this.track('Workflow execution errored', properties);
			}
		}
	}

	private addExecutionTrackData(workflowId: string, key: ExecutionTrackDataKey, execTime: Date) {
		const executionTrackData = this.executionCountsBuffer[workflowId][key];

		if (!executionTrackData) {
			this.executionCountsBuffer[workflowId][key] = {
				count: 1,
				first: execTime,
			};
		} else {
			executionTrackData.count++;
		}
	}

	trackAgentExecution(properties: IAgentExecutionTrackProperties) {
		if (!this.rudderStack) return;

		const {
			agent_id,
			user_id,
			message_count = 0,
			token_count = 0,
			tool_call_count = 0,
		} = properties;
		const bufferKey = this.getAgentExecutionCountsBufferKey(agent_id, user_id);

		this.agentExecutionCountsBuffer[bufferKey] = this.agentExecutionCountsBuffer[bufferKey] ?? {
			agent_id,
			...(user_id ? { user_id } : {}),
			message_count: 0,
			token_count: 0,
			tool_call_count: 0,
		};

		const agentExecutionCounts = this.agentExecutionCountsBuffer[bufferKey];
		agentExecutionCounts.message_count += message_count;
		agentExecutionCounts.token_count += token_count;
		agentExecutionCounts.tool_call_count += tool_call_count;
	}

	trackAgentTurnFinished(properties: IAgentTurnFinishedTrackProperties) {
		if (!this.rudderStack) return;

		const bufferKey = this.getAgentSessionMetricsBufferKey(properties);
		this.agentSessionMetricsBuffer[bufferKey] = this.agentSessionMetricsBuffer[bufferKey] ?? {
			agent_id: properties.agent_id,
			run_type: properties.run_type,
			turn_status: properties.turn_status,
			configuration: properties.configuration,
			sessions: {},
		};

		const bucket = this.agentSessionMetricsBuffer[bufferKey];
		const session = bucket.sessions[properties.thread_id] ?? {
			latency_ms: 0,
			cost: 0,
			tool_call_count: 0,
			num_skills: properties.configuration.num_skills,
			turn_count: 0,
		};

		session.latency_ms += properties.latency_ms;
		session.cost += properties.cost;
		session.tool_call_count += properties.tool_call_count;
		session.turn_count++;
		bucket.sessions[properties.thread_id] = session;
	}

	trackApiInvocation(properties: IApiInvocationProperties) {
		if (!this.rudderStack) return;

		const { user_id, path, method, user_agent } = properties;

		this.apiInvocationsBuffer[user_id] = this.apiInvocationsBuffer[user_id] ?? {
			total_calls: 0,
			first: new Date(),
			endpoints: {},
			user_agents: {},
		};

		const entry = this.apiInvocationsBuffer[user_id];
		entry.total_calls++;

		const endpointKey = `${method} ${path}`;
		entry.endpoints[endpointKey] = (entry.endpoints[endpointKey] ?? 0) + 1;

		if (user_agent) {
			entry.user_agents[user_agent] = (entry.user_agents[user_agent] ?? 0) + 1;
		}
	}

	@OnShutdown(LOWEST_SHUTDOWN_PRIORITY)
	async stopTracking(): Promise<void> {
		clearInterval(this.pulseIntervalReference);

		await Promise.all([this.postHog.stop(), this.rudderStack?.flush()]);
	}

	// Sets instance group properties and attaches user to instance group.
	groupIdentify({
		userId,
		traits,
	}: {
		userId?: string;
		traits?: Record<string, string | number>;
	}): void {
		const { instanceId } = this.instanceSettings;
		if (!instanceId) return;

		if (this.postHog) {
			this.postHog.groupIdentify({
				...(userId && { distinctId: `${instanceId}#${userId}` }),
				instanceId,
				properties: traits,
			});
		}

		if (this.rudderStack) {
			this.rudderStack.group({
				groupId: instanceId,
				userId: userId ? `${instanceId}#${userId}` : instanceId, // Rudderstack requires a userId for group calls, using instanceId as fallback
				traits,
				context: {
					ip: '0.0.0.0',
				},
			});
		}
	}

	identify(
		traits?: { [key: string]: string | number | boolean | object | undefined | null },
		userId?: string,
	): void {
		const { instanceId } = this.instanceSettings;
		if (!instanceId) return;

		if (this.rudderStack) {
			this.rudderStack.identify({
				userId: userId ? `${instanceId}#${userId}` : instanceId, // If no userId provided, falling back to instanceId for cross-compatibility
				traits: { ...traits, instanceId },
				context: {
					ip: '0.0.0.0',
				},
			});
		}

		if (this.postHog && userId) {
			this.postHog.identify({
				distinctId: `${instanceId}#${userId}`,
				properties: traits,
			});
		}
	}

	track(eventName: string, properties: ITelemetryTrackProperties = {}) {
		if (!this.rudderStack) {
			return;
		}

		const { instanceId } = this.instanceSettings;
		const { user_id } = properties;
		const updatedProperties = {
			...properties,
			instance_id: instanceId,
			user_id: user_id ?? undefined,
			version_cli: N8N_VERSION,
		};

		const payload = {
			userId: `${instanceId}${user_id ? `#${user_id}` : ''}`,
			event: eventName,
			properties: updatedProperties,
			context: {},
		};

		// Build the actual payload that will be sent to RudderStack (with fake IP)
		const rudderStackPayload = {
			...payload,
			// provide a fake IP address to instruct RudderStack to not use the user's IP address
			context: { ...payload.context, ip: '0.0.0.0' },
		};

		// Limiting payload size to 32 KB - measure the actual payload sent to RudderStack
		const payloadSize = Buffer.byteLength(JSON.stringify(rudderStackPayload), 'utf8');
		const maxPayloadSize = 32 << 10; // 32 KB

		if (payloadSize > maxPayloadSize) {
			return;
		}

		this.postHog?.track(payload);

		return this.rudderStack.track(rudderStackPayload);
	}

	// test helpers
	getCountsBuffer(): IExecutionsBuffer {
		return this.executionCountsBuffer;
	}

	getApiInvocationsBuffer(): IApiInvocationsBuffer {
		return this.apiInvocationsBuffer;
	}

	getAgentExecutionCountsBuffer(): IAgentExecutionCountsBuffer {
		return this.agentExecutionCountsBuffer;
	}

	getAgentSessionMetricsBuffer(): IAgentSessionMetricsBuffer {
		return this.agentSessionMetricsBuffer;
	}
}
