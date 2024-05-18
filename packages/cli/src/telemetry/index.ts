import axios from 'axios';
import type RudderStack from '@rudderstack/rudder-sdk-node';
import { PostHogClient } from '@/posthog';
import { Container, Service } from 'typedi';
import type { ITelemetryTrackProperties } from 'n8n-workflow';
import { InstanceSettings } from 'n8n-core';

import config from '@/config';
import type { IExecutionTrackProperties } from '@/Interfaces';
import { Logger } from '@/Logger';
import { License } from '@/License';
import { N8N_VERSION } from '@/constants';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { SourceControlPreferencesService } from '../environments/sourceControl/sourceControlPreferences.service.ee';
import { UserRepository } from '@db/repositories/user.repository';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';

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

			const logLevel = config.getEnv('logs.level');

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

	private async pulse(): Promise<unknown> {
		if (!this.rudderStack) {
			return;
		}

		const allPromises = Object.keys(this.executionCountsBuffer)
			.filter((workflowId) => {
				const data = this.executionCountsBuffer[workflowId];
				const sum =
					(data.manual_error?.count ?? 0) +
					(data.manual_success?.count ?? 0) +
					(data.prod_error?.count ?? 0) +
					(data.prod_success?.count ?? 0);
				return sum > 0;
			})
			.map(async (workflowId) => {
				const promise = this.track('Workflow execution count', {
					event_version: '2',
					workflow_id: workflowId,
					...this.executionCountsBuffer[workflowId],
				});

				return await promise;
			});

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
		allPromises.push(this.track('pulse', pulsePacket));
		return await Promise.all(allPromises);
	}

	async trackWorkflowExecution(properties: IExecutionTrackProperties): Promise<void> {
		if (this.rudderStack) {
			const execTime = new Date();
			const workflowId = properties.workflow_id;

			this.executionCountsBuffer[workflowId] = this.executionCountsBuffer[workflowId] ?? {
				user_id: properties.user_id,
			};

			const key: ExecutionTrackDataKey = `${properties.is_manual ? 'manual' : 'prod'}_${
				properties.success ? 'success' : 'error'
			}`;

			if (!this.executionCountsBuffer[workflowId][key]) {
				this.executionCountsBuffer[workflowId][key] = {
					count: 1,
					first: execTime,
				};
			} else {
				this.executionCountsBuffer[workflowId][key]!.count++;
			}

			if (
				!properties.success &&
				properties.is_manual &&
				properties.error_node_type?.startsWith('n8n-nodes-base')
			) {
				void this.track('Workflow execution errored', properties);
			}
		}
	}

	async trackN8nStop(): Promise<void> {
		clearInterval(this.pulseIntervalReference);
		await this.track('User instance stopped');
		void Promise.all([this.postHog.stop(), this.rudderStack?.flush()]);
	}

	async identify(traits?: {
		[key: string]: string | number | boolean | object | undefined | null;
	}): Promise<void> {
		const { instanceId } = this.instanceSettings;
		return await new Promise<void>((resolve) => {
			if (this.rudderStack) {
				this.rudderStack.identify(
					{
						userId: instanceId,
						traits: { ...traits, instanceId },
					},
					resolve,
				);
			} else {
				resolve();
			}
		});
	}

	async track(
		eventName: string,
		properties: ITelemetryTrackProperties = {},
		{ withPostHog } = { withPostHog: false }, // whether to additionally track with PostHog
	): Promise<void> {
		const { instanceId } = this.instanceSettings;
		return await new Promise<void>((resolve) => {
			if (this.rudderStack) {
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
				};

				if (withPostHog) {
					this.postHog?.track(payload);
				}

				return this.rudderStack.track(payload, resolve);
			}

			return resolve();
		});
	}

	// test helpers
	getCountsBuffer(): IExecutionsBuffer {
		return this.executionCountsBuffer;
	}
}
