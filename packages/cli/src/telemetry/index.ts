import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import {
	InstanceRegistryProxyService,
	TelemetryProxy,
	type TelemetryTracker,
} from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import {
	ProjectRelationRepository,
	ProjectRepository,
	WorkflowRepository,
	UserRepository,
} from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type { InferTelemetryProps, TelemetryEventDef } from '@n8n/telemetry';
import { redactTelemetryProperties } from '@n8n/telemetry';
import type RudderStack from '@rudderstack/rudder-sdk-node';
import type { AxiosRequestConfig } from 'axios';
import { ErrorReporter, InstanceSettings } from 'n8n-core';
import type { ITelemetryTrackProperties } from 'n8n-workflow';

import { LOWEST_SHUTDOWN_PRIORITY, N8N_VERSION } from '@/constants';
import type { IExecutionTrackProperties } from '@/interfaces';
import { License } from '@/license';
import { PostHogClient } from '@/posthog';
import type { PublicApiClient } from '@/public-api/public-api-client';

import { SourceControlPreferencesService } from '../modules/source-control.ee/source-control-preferences.service.ee';
import { USER_CALLED_MCP_TOOL_EVENT } from '../modules/mcp/mcp.constants';
import { summarizeFootprint } from './cluster-footprint';

type ExecutionTrackDataKey =
	| 'manual_error'
	| 'manual_success'
	| 'prod_error'
	| 'prod_success'
	| 'manual_crashed'
	| 'prod_crashed'
	| `${'instance_ai'}_${'mock' | 'real'}_${'manual' | 'prod'}_${'error' | 'success' | 'crashed'}`
	| `personal_credentials_${'manual' | 'prod'}`;

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
	client: PublicApiClient;
}

interface IApiInvocationsBufferEntry {
	total_calls: number;
	first: Date;
	endpoints: Record<string, number>;
	endpoints_by_client: { editor_ui: Record<string, number> };
	user_agents: Record<string, number>;
	clients: Record<PublicApiClient, number>;
}

interface IApiInvocationsBuffer {
	[userId: string]: IApiInvocationsBufferEntry;
}

@Service()
export class Telemetry implements TelemetryTracker {
	private rudderStack?: RudderStack;

	private userCloudId?: string;

	private executionCountsBuffer: IExecutionsBuffer = {};

	private apiInvocationsBuffer: IApiInvocationsBuffer = {};

	private readonly bufferFlushers: (() => void)[] = [];

	/** Event names already reported by `warnAboutMissingUserId`, so each one is said once. */
	private readonly eventsMissingUserId = new Set<string>();

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
		Container.get(TelemetryProxy).registerProvider(this);

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
					useDefaultSsrfPolicy: 'unsafe', // The data-plane host is fixed and the SDK owns the request lifecycle, so SSRF is disabled.
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
		}
	}

	/**
	 * Sends the events buffered in this process and empties the buffers. Does
	 * nothing while diagnostics are off, because nothing buffers then.
	 */
	flushBuffers(): void {
		if (!this.rudderStack) {
			return;
		}

		this.flushWorkflowExecutionCounts();
		for (const flush of this.bufferFlushers) flush();
		this.flushApiInvocations();
	}

	/**
	 * Sends one `pulse` packet of license and usage counters. The counters
	 * describe the whole instance, so a second sender reports the same numbers
	 * again. Does nothing while diagnostics are off.
	 */
	async sendPulsePacket(): Promise<void> {
		if (!this.rudderStack) {
			return;
		}

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
			...summarizeFootprint(await Container.get(InstanceRegistryProxyService).getAllInstances()),
		};

		this.track('pulse', pulsePacket);
	}

	private flushApiInvocations() {
		for (const userId of Object.keys(this.apiInvocationsBuffer)) {
			const entry = this.apiInvocationsBuffer[userId];
			if (entry.total_calls > 0) {
				this.track('Public API usage', {
					user_id: userId,
					total_calls: entry.total_calls,
					first: entry.first,
					endpoints: JSON.stringify(entry.endpoints),
					endpoints_by_client: JSON.stringify(entry.endpoints_by_client),
					user_agents: JSON.stringify(entry.user_agents),
					clients: JSON.stringify(entry.clients),
				});
			}
		}
		this.apiInvocationsBuffer = {};
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

			// Counted in the per-workflow aggregate, not as an event for each run.
			if (properties.personal_credentials_count) {
				this.addExecutionTrackData(workflowId, `personal_credentials_${executionMode}`, execTime);
			}

			if (properties.used_end_user_credentials) {
				this.track('Workflow execution with end-user credentials', properties);
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

	trackApiInvocation(properties: IApiInvocationProperties) {
		if (!this.rudderStack) return;

		const { user_id, path, method, user_agent, client } = properties;

		const entry = (this.apiInvocationsBuffer[user_id] ??= {
			total_calls: 0,
			first: new Date(),
			endpoints: {},
			endpoints_by_client: { editor_ui: {} },
			user_agents: {},
			clients: { editor_ui: 0, other: 0 },
		});
		entry.total_calls++;
		entry.clients[client]++;

		const endpointKey = `${method} ${path}`;
		entry.endpoints[endpointKey] = (entry.endpoints[endpointKey] ?? 0) + 1;

		// Only editor UI calls are counted per endpoint for now to help keep event size down.
		if (client === 'editor_ui') {
			const editorUiEndpoints = entry.endpoints_by_client.editor_ui;
			editorUiEndpoints[endpointKey] = (editorUiEndpoints[endpointKey] ?? 0) + 1;
		}

		if (user_agent) {
			entry.user_agents[user_agent] = (entry.user_agents[user_agent] ?? 0) + 1;
		}
	}

	isEnabled(): boolean {
		return this.rudderStack !== undefined;
	}

	addBufferFlusher(flusher: () => void): void {
		this.bufferFlushers.push(flusher);
	}

	/** Sends the queued events now, instead of at the next flush interval. */
	async flushQueue(): Promise<void> {
		await this.rudderStack?.flush();
	}

	@OnShutdown(LOWEST_SHUTDOWN_PRIORITY)
	async stopTracking(): Promise<void> {
		await Promise.all([this.postHog.stop(), this.rudderStack?.flush()]);
	}

	// Sets instance group properties and attaches user to instance group.
	groupIdentify({
		userId,
		traits,
		postHog = { userId, traits },
	}: {
		userId?: string;
		traits?: Record<string, string | number>;
		/**
		 * PostHog-only override. PostHog refuses a group update with no real person
		 * behind it, while RudderStack accepts the bare instance ID. Use it when the
		 * two destinations must diverge, e.g. to attribute startup facts to the owner.
		 */
		postHog?: { userId?: string; traits?: Record<string, string | number> };
	}): void {
		const { instanceId } = this.instanceSettings;
		if (!instanceId) return;

		if (this.postHog && postHog.userId) {
			this.postHog.groupIdentify({
				distinctId: `${instanceId}#${postHog.userId}`,
				instanceId,
				properties: postHog.traits,
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

	setUserCloudId(userCloudId?: string) {
		this.userCloudId = userCloudId;
	}

	track<T extends TelemetryEventDef>(event: T, properties: InferTelemetryProps<T>): void;
	track(eventName: string, properties?: ITelemetryTrackProperties): void;
	track(event: string | TelemetryEventDef, properties: ITelemetryTrackProperties = {}) {
		const eventName = typeof event === 'string' ? event : event.name;

		if (typeof event !== 'string') {
			const validationError = event.getValidationError(properties);
			if (validationError) this.logger.warn(validationError);
		}

		if (!this.rudderStack) {
			return;
		}

		const { instanceId } = this.instanceSettings;
		const { user_id } = properties;
		const updatedProperties = {
			...(eventName === USER_CALLED_MCP_TOOL_EVENT
				? redactTelemetryProperties(properties)
				: properties),
			instance_id: instanceId,
			user_id: user_id ?? undefined,
			version_cli: N8N_VERSION,
		};

		const payload = {
			userId: `${instanceId}${user_id ? `#${user_id}` : ''}`,
			event: eventName,
			properties: updatedProperties,
			context: this.userCloudId ? { traits: { user_cloud_id: this.userCloudId } } : {},
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

		if (typeof event !== 'string' && !user_id) {
			this.warnAboutMissingUserId(eventName);
		}

		this.postHog?.track(payload);

		return this.rudderStack.track(rudderStackPayload);
	}

	/**
	 * A registered event whose properties carry no `user_id` composes a distinct id of the bare
	 * instance id, which `PostHogClient.track` drops to keep a phantom person profile out of
	 * PostHog (#32344). The event still reaches RudderStack, so the loss is silent and only a
	 * warehouse comparison finds it. This says so once for each event name, which is enough to
	 * name the emit site and few enough to leave the logs readable.
	 *
	 * Only registered events are checked. A plain string event has no schema stating that it
	 * describes a user action, and some of them are instance-level on purpose.
	 */
	private warnAboutMissingUserId(eventName: string): void {
		if (this.eventsMissingUserId.has(eventName)) return;
		this.eventsMissingUserId.add(eventName);
		this.logger.warn(
			`Telemetry event "${eventName}" carries no user_id, so PostHog drops it. Pass user_id in the event properties at the emit site.`,
		);
	}

	// test helpers
	getCountsBuffer(): IExecutionsBuffer {
		return this.executionCountsBuffer;
	}

	getApiInvocationsBuffer(): IApiInvocationsBuffer {
		return this.apiInvocationsBuffer;
	}
}
