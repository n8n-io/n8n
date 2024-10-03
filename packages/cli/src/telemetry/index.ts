import { GlobalConfig } from '@n8n/config';
import type RudderStack from '@rudderstack/rudder-sdk-node';
import axios from 'axios';
import { InstanceSettings } from 'n8n-core';
import type { ITelemetryTrackProperties } from 'n8n-workflow';
import { Container, Service } from 'typedi';

import config from '@/config';
import { LOWEST_SHUTDOWN_PRIORITY, N8N_VERSION } from '@/constants';
import { ProjectRelationRepository } from '@/databases/repositories/project-relation.repository';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { OnShutdown } from '@/decorators/on-shutdown';
import type { IExecutionTrackProperties } from '@/interfaces';
import { License } from '@/license';
import { Logger } from '@/logging/logger.service';
import { PostHogClient } from '@/posthog';

import { SourceControlPreferencesService } from '../environments/source-control/source-control-preferences.service.ee';

type ExecutionTrackDataKey = 'manual_error' | 'manual_success' | 'prod_error' | 'prod_success';

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
	) {}

	async init() {
		const enabled = config.getEnv('diagnostics.enabled');
		if (enabled) {
			const conf = config.getEnv('diagnostics.config.backend');
			const [key, dataPlaneUrl] = conf.split(';');

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
				(data.prod_success?.count ?? 0);
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

			const key: ExecutionTrackDataKey = `${properties.is_manual ? 'manual' : 'prod'}_${
				properties.success ? 'success' : 'error'
			}`;

			const executionTrackDataKey = this.executionCountsBuffer[workflowId][key];

			if (!executionTrackDataKey) {
				this.executionCountsBuffer[workflowId][key] = {
					count: 1,
					first: execTime,
				};
			} else {
				executionTrackDataKey.count++;
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

	identify(traits?: { [key: string]: string | number | boolean | object | undefined | null }) {
		if (!this.rudderStack) {
			return;
		}

		const { instanceId } = this.instanceSettings;

		this.rudderStack.identify({
			userId: instanceId,
			traits: { ...traits, instanceId },
			context: {
				// provide a fake IP address to instruct RudderStack to not use the user's IP address
				ip: '0.0.0.0',
			},
		});
	}

	track(
		eventName: string,
		properties: ITelemetryTrackProperties = {},
		{ withPostHog } = { withPostHog: false }, // whether to additionally track with PostHog
	) {
		if (!this.rudderStack) {
			return;
		}

		const { instanceId } = this.instanceSettings;
		const { user_id } = properties;
		const updatedProperties = {
			...properties,
			instance_id: instanceId,
			version_cli: N8N_VERSION,
		};

		const payload = {
			userId: `${instanceId}${user_id ? `#${user_id}` : ''}`,
			event: eventName,
			properties: updatedProperties,
			context: {},
		};

		if (withPostHog) {
			this.postHog?.track(payload);
		}

		return this.rudderStack.track({
			...payload,
			// provide a fake IP address to instruct RudderStack to not use the user's IP address
			context: { ...payload.context, ip: '0.0.0.0' },
		});
	}

	// test helpers
	getCountsBuffer(): IExecutionsBuffer {
		return this.executionCountsBuffer;
	}
}
