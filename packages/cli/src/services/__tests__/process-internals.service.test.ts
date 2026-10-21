import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { ActiveWorkflowTriggers, InstanceSettings, ScheduledTaskManager } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { ActiveExecutions } from '@/active-executions';
import { Push } from '@/push';
import type { WebSocketPush } from '@/push/websocket.push';
import { ScalingService } from '@/scaling/scaling.service';
import { ProcessInternalsService } from '@/services/process-internals.service';
import { WaitTracker } from '@/wait-tracker';

describe('ProcessInternalsService', () => {
	const scalingService = mockInstance(ScalingService);
	const activeExecutions = mockInstance(ActiveExecutions);
	const activeWorkflowTriggers = mockInstance(ActiveWorkflowTriggers);
	const scheduledTaskManager = mockInstance(ScheduledTaskManager);
	const waitTracker = mockInstance(WaitTracker);
	const push = mockInstance(Push);

	beforeEach(() => {
		vi.clearAllMocks();
		scalingService.getDiagnosticCounts.mockReturnValue({
			jobResults: 3,
			queueListeners: 7,
			runningJobs: 0,
		});
		activeExecutions.getDiagnosticCounts.mockReturnValue({ executions: 2, responseModes: 1 });
		activeWorkflowTriggers.getDiagnosticCounts.mockReturnValue({ workflows: 4 });
		scheduledTaskManager.getDiagnosticCounts.mockReturnValue({ crons: 2 });
		waitTracker.getDiagnosticCounts.mockReturnValue({ waitingExecutions: 6 });
		push.getBackend.mockReturnValue(
			mock<WebSocketPush>({
				getDiagnosticCounts: () => ({ connections: 8 }),
			}),
		);
	});

	const createService = (
		instanceType: InstanceSettings['instanceType'],
		mode: 'regular' | 'queue',
	) =>
		new ProcessInternalsService(
			mock<InstanceSettings>({ instanceType, hostId: `${instanceType}-1`, isLeader: true }),
			mock<GlobalConfig>({ executions: { mode } }),
		);

	it('should report every collection a queue-mode main owns', () => {
		const internals = createService('main', 'queue').collect();

		expect(internals).toMatchObject({
			version: 1,
			instanceType: 'main',
			hostId: 'main-1',
			isLeader: true,
		});
		expect(internals.collections).toEqual({
			'scaling.jobResults': 3,
			'scaling.queueListeners': 7,
			'scaling.runningJobs': 0,
			'activeExecutions.executions': 2,
			'activeExecutions.responseModes': 1,
			'triggers.workflows': 4,
			'scheduledTasks.crons': 2,
			'waitTracker.waitingExecutions': 6,
			'push.connections': 8,
		});
		expect(internals.memory.heapUsed).toBeGreaterThan(0);
		expect(Object.values(internals.resources).every((count) => count > 0)).toBe(true);
	});

	it('should omit scaling collections in regular mode', () => {
		const internals = createService('main', 'regular').collect();

		expect(Object.keys(internals.collections).some((key) => key.startsWith('scaling.'))).toBe(
			false,
		);
	});

	it('should report only scaling collections on a worker', () => {
		const internals = createService('worker', 'queue').collect();

		expect(Object.keys(internals.collections)).toEqual([
			'scaling.jobResults',
			'scaling.queueListeners',
			'scaling.runningJobs',
		]);
		expect(activeExecutions.getDiagnosticCounts).not.toHaveBeenCalled();
		expect(waitTracker.getDiagnosticCounts).not.toHaveBeenCalled();
	});

	it('should report scaling and active executions on a webhook process', () => {
		const internals = createService('webhook', 'queue').collect();

		expect(Object.keys(internals.collections)).toEqual([
			'scaling.jobResults',
			'scaling.queueListeners',
			'scaling.runningJobs',
			'activeExecutions.executions',
			'activeExecutions.responseModes',
		]);
	});
});
