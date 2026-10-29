import type { ProcessInternals } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import { ActiveWorkflowTriggers, InstanceSettings, ScheduledTaskManager } from 'n8n-core';

import { ActiveExecutions } from '@/active-executions';
import { Push } from '@/push';
import { ScalingService } from '@/scaling/scaling.service';
import { WaitTracker } from '@/wait-tracker';

type Counts = Record<string, number>;

/**
 * Collects counts of in-memory state in this process, for E2E and soak tests.
 * Counts only, never contents. Reads only the services this process type runs.
 */
@Service()
export class ProcessInternalsService {
	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly globalConfig: GlobalConfig,
	) {}

	collect(): ProcessInternals {
		const { instanceType, hostId, isLeader } = this.instanceSettings;
		const collections: Counts = {};
		const add = (owner: string, counts: Counts) => {
			for (const [name, value] of Object.entries(counts)) collections[`${owner}.${name}`] = value;
		};

		if (this.globalConfig.executions.mode === 'queue') {
			add('scaling', Container.get(ScalingService).getDiagnosticCounts());
		}

		if (instanceType === 'main' || instanceType === 'webhook') {
			add('activeExecutions', Container.get(ActiveExecutions).getDiagnosticCounts());
		}

		if (instanceType === 'main') {
			add('triggers', Container.get(ActiveWorkflowTriggers).getDiagnosticCounts());
			add('scheduledTasks', Container.get(ScheduledTaskManager).getDiagnosticCounts());
			add('waitTracker', Container.get(WaitTracker).getDiagnosticCounts());
			add('push', Container.get(Push).getBackend().getDiagnosticCounts());
		}

		const resources: Counts = {};
		for (const type of process.getActiveResourcesInfo()) {
			resources[type] = (resources[type] ?? 0) + 1;
		}

		const { rss, heapTotal, heapUsed, external, arrayBuffers } = process.memoryUsage();

		return {
			version: 1,
			instanceType,
			hostId,
			isLeader,
			memory: { rss, heapTotal, heapUsed, external, arrayBuffers },
			resources,
			collections,
		};
	}
}
