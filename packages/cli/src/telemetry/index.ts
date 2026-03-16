import { Logger } from '@n8n/backend-common';
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
import axios from 'axios';
import { ErrorReporter, InstanceSettings } from 'n8n-core';
import type { ITelemetryTrackProperties } from 'n8n-workflow';

import { LOWEST_SHUTDOWN_PRIORITY, N8N_VERSION } from '@/constants';
import type { IExecutionTrackProperties } from '@/interfaces';
import { License } from '@/license';
import { PostHogClient } from '@/posthog';

import { SourceControlPreferencesService } from '../modules/source-control.ee/source-control-preferences.service.ee';

type ExecutionTrackDataKey =
	| 'manual_error'
	| 'manual_success'
	| 'prod_error'
	| 'prod_success'
	| 'manual_crashed'
	| 'prod_crashed';

interface IExecutionTrackData {
	count: number;
	first: Date;
}

interface IExecutionsBuffer {
	[workflowId: string]: {
		manual_error?: IExecutionTrackData;
		manual_success?: IExecutionTrackData;
		prod_error?: IExecutionTrackData;
		prod_success?: IExecutionTrackData;
		manual_crashed?: IExecutionTrackData;
		prod_crashed?: IExecutionTrackData;
		user_id: string | undefined;
	};
}

@Service()
export class Telemetry {
	private rudderStack?: RudderStack;

	private pulseIntervalReference: NodeJS.Timeout;

	private executionCountsBuffer: IExecutionsBuffer = {};

	constructor(
		private readonly logger: Logger,
		private readonly postHog: PostHogClient,
		private readonly license: License,
		private readonly instanceSettings: InstanceSettings,
		private readonly workflowRepository: WorkflowRepository,
		private readonly globalConfig: GlobalConfig,
		private readonly errorReporter: ErrorReporter,
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
			const axiosInstance = axios.create();
			axiosInstance.interceptors.request.use((cfg) => {
				cfg.headers.setContentType('application/json', false);
				return cfg;
			});
			this.rudderStack = new RudderStack(key, {
				axiosInstance,
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

			const executionTrackDataKey = this.executionCountsBuffer[workflowId][key];

			if (!executionTrackDataKey) {
				this.executionCountsBuffer[workflowId][key] = {
					count: 1,
					first: execTime,
				};
			} else {
				executionTrackDataKey.count++;
			}

			if (properties.used_dynamic_credentials) {
				this.track('Workflow execution with dynamic credentials', properties);
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

	@OnShutdown(LOWEST_SHUTDOWN_PRIORITY)
	async stopTracking(): Promise<void> {
		clearInterval(this.pulseIntervalReference);

		await Promise.all([this.postHog.stop(), this.rudderStack?.flush()]);
	}

	// Used for either adding properties to group (no userId provided), or attaching user to instance group (userId provided)
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
					// provide a fake IP address to instruct RudderStack to not use the user's IP address
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
}
