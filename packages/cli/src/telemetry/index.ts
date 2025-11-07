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
import { InstanceSettings } from 'n8n-core';
import type { ITelemetryTrackProperties } from 'n8n-workflow';

import { LOWEST_SHUTDOWN_PRIORITY, N8N_VERSION } from '@/constants';
import type { IExecutionTrackProperties } from '@/interfaces';

import { SourceControlPreferencesService } from '../environments.ee/source-control/source-control-preferences.service.ee';
import { TelemetryManagementService } from '@/modules/telemetry-management/telemetry-management.service';

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
	private pulseIntervalReference: NodeJS.Timeout;

	private executionCountsBuffer: IExecutionsBuffer = {};

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly workflowRepository: WorkflowRepository,
		private readonly globalConfig: GlobalConfig,
		private readonly telemetryManagementService: TelemetryManagementService,
	) {}

	async init() {
		const { enabled } = this.globalConfig.diagnostics;
		if (enabled) {
			this.logger.info('Telemetry initialized - using local storage only');
			this.startPulse();
		} else {
			this.logger.info('Telemetry is disabled');
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
		// Report workflow execution counts
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

		// Clear buffer after reporting
		this.executionCountsBuffer = {};

		// Collect instance statistics
		const sourceControlPreferences = Container.get(
			SourceControlPreferencesService,
		).getPreferences();

		const pulsePacket = {
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
		const execTime = new Date();
		const workflowId = properties.workflow_id;

		// Initialize buffer for this workflow if not exists
		this.executionCountsBuffer[workflowId] = this.executionCountsBuffer[workflowId] ?? {
			user_id: properties.user_id,
		};

		// Determine the execution type key
		let key: ExecutionTrackDataKey;
		if (properties.crashed) {
			key = `${properties.is_manual ? 'manual' : 'prod'}_crashed`;
		} else {
			key = `${properties.is_manual ? 'manual' : 'prod'}_${
				properties.success ? 'success' : 'error'
			}`;
		}

		const executionTrackDataKey = this.executionCountsBuffer[workflowId][key];

		// Update execution count
		if (!executionTrackDataKey) {
			this.executionCountsBuffer[workflowId][key] = {
				count: 1,
				first: execTime,
			};
		} else {
			executionTrackDataKey.count++;
		}

		// Track errors from n8n-nodes-base in manual executions
		if (
			!properties.success &&
			properties.is_manual &&
			properties.error_node_type?.startsWith('n8n-nodes-base')
		) {
			this.track('Workflow execution errored', properties);
		}
	}

	@OnShutdown(LOWEST_SHUTDOWN_PRIORITY)
	async stopTracking(): Promise<void> {
		clearInterval(this.pulseIntervalReference);

		// Flush any remaining execution counts before shutdown
		if (Object.keys(this.executionCountsBuffer).length > 0) {
			await this.pulse();
		}
	}

	identify(traits?: { [key: string]: string | number | boolean | object | undefined | null }) {
		// Store identification data in local telemetry
		const { instanceId } = this.instanceSettings;

		void this.telemetryManagementService.trackEvent({
			eventName: 'identify',
			properties: { ...traits, instanceId },
			instanceId,
			source: 'backend',
		});
	}

	track(eventName: string, properties: ITelemetryTrackProperties = {}) {
		const { instanceId } = this.instanceSettings;
		const { user_id } = properties;
		const updatedProperties = {
			...properties,
			instance_id: instanceId,
			version_cli: N8N_VERSION,
		};

		// Save to local database only
		void this.telemetryManagementService.trackEvent({
			eventName,
			properties: updatedProperties,
			userId: user_id ? String(user_id) : undefined,
			workflowId: properties.workflow_id ? String(properties.workflow_id) : undefined,
			instanceId,
			source: 'backend',
		});
	}

	// test helpers
	getCountsBuffer(): IExecutionsBuffer {
		return this.executionCountsBuffer;
	}
}
