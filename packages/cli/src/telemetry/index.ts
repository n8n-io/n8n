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
import { InstanceSettings } from 'n8n-core';
import type { ITelemetryTrackProperties } from 'n8n-workflow';

import { LOWEST_SHUTDOWN_PRIORITY, N8N_VERSION } from '@/constants';
import type { IExecutionTrackProperties } from '@/interfaces';
import { License } from '@/license';
import { PostHogClient } from '@/posthog';
import { UrlService } from '@/services/url.service';
import { OwnershipService } from '@/services/ownership.service';

import { SourceControlPreferencesService } from '../environments.ee/source-control/source-control-preferences.service.ee';

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
		private readonly urlService: UrlService,
		private readonly ownershipService: OwnershipService,
	) {}

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
			});

			this.startPulse();
		}
	}

	private startPulse() {
		this.pulseIntervalReference = setInterval(async () => {
			void this.pulse();
		}, 60 * 1000); // every 6 hours
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

		// Collect production failure summaries
		const prodFailureSummaries: Array<{
			workflowURL: string;
			workflowName: string;
			prodFailureCount: number;
		}> = [];

		for (const workflowId of workflowIdsToReport) {
			const data = this.executionCountsBuffer[workflowId];

			// Track the existing workflow execution count event
			this.track('Workflow execution count', {
				event_version: '2',
				workflow_id: workflowId,
				...data,
			});

			// Collect production failures for summary
			if (data.prod_error && data.prod_error.count > 0) {
				try {
					// Fetch workflow details to get the name
					const workflow = await this.workflowRepository.findOne({
						where: { id: workflowId },
						select: ['name'],
					});

					if (workflow) {
						const workflowUrl = `${this.urlService.getWebhookBaseUrl()}workflow/${workflowId}`;
						prodFailureSummaries.push({
							workflowURL: workflowUrl,
							workflowName: workflow.name,
							prodFailureCount: data.prod_error.count,
						});
					}
				} catch (error) {
					// Skip this workflow if we can't fetch details
					this.logger.debug(`Could not fetch workflow details for ${workflowId}`, { error });
				}
			}
		}

		// Send production failure summary event if there are any failures
		// Check user settings to see if this telemetry is enabled
		if (prodFailureSummaries.length > 0) {
			let shouldEmit = true; // Default to emitting if we can't check settings

			try {
				const instanceOwner = await this.ownershipService.getInstanceOwner();
				// Only skip if explicitly set to false
				if (instanceOwner?.settings?.enableWorkflowFailureSummary === false) {
					shouldEmit = false;
				}
			} catch (error) {
				// If we can't check settings, default to emitting (shouldEmit remains true)
				this.logger.debug('Could not check instance owner settings', { error });
			}

			if (shouldEmit) {
				this.track('Production workflow failures summary', {
					summaryPeriodHours: 6,
					totalFailedWorkflows: prodFailureSummaries.length,
					workflows: prodFailureSummaries,
				});
			}
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

	track(eventName: string, properties: ITelemetryTrackProperties = {}) {
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
