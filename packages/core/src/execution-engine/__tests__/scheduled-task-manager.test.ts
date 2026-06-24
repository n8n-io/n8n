import type { Logger } from '@n8n/backend-common';
import type { CronContext, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { InstanceSettings } from '@/instance-settings';

import { CronRegistry } from '../cron-registry';
import { ScheduledTaskManager } from '../scheduled-task-manager';

const logger = mock<Logger>({ scoped: vi.fn().mockReturnValue(mock<Logger>()) });

describe('ScheduledTaskManager', () => {
	const instanceSettings = mock<InstanceSettings>({ isLeader: true });
	const workflow = mock<Workflow>({ timezone: 'GMT' });
	const everyMinute = '0 * * * * *';

	const onTick = vi.fn();

	let cronRegistry: CronRegistry;
	let scheduledTaskManager: ScheduledTaskManager;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		cronRegistry = new CronRegistry(instanceSettings, logger, mock());
		scheduledTaskManager = new ScheduledTaskManager(cronRegistry);
	});

	it('should not register duplicate crons', () => {
		const ctx: CronContext = {
			workflowId: workflow.id,
			nodeId: 'test-node-id',
			timezone: workflow.timezone,
			expression: everyMinute,
		};

		scheduledTaskManager.registerCron(ctx, onTick);

		scheduledTaskManager.registerCron(ctx, onTick);
		vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes

		expect(onTick).toHaveBeenCalledTimes(10);
	});

	it('should throw when workflow timezone is invalid', () => {
		expect(() =>
			scheduledTaskManager.registerCron(
				{
					workflowId: workflow.id,
					nodeId: 'test-node-id',
					timezone: 'somewhere',
					expression: everyMinute,
				},
				onTick,
			),
		).toThrow('Invalid timezone.');
	});

	it('should throw when cron expression is invalid', () => {
		expect(() =>
			scheduledTaskManager.registerCron(
				{
					workflowId: workflow.id,
					nodeId: 'test-node-id',
					timezone: workflow.timezone,
					// @ts-expect-error invalid cron expression is a type-error
					expression: 'invalid-cron-expression',
				},
				onTick,
			),
		).toThrow();
	});

	it('should register valid CronJobs', () => {
		scheduledTaskManager.registerCron(
			{
				workflowId: workflow.id,
				nodeId: 'test-node-id',
				timezone: workflow.timezone,
				expression: everyMinute,
			},
			onTick,
		);

		expect(onTick).not.toHaveBeenCalled();
		vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
		expect(onTick).toHaveBeenCalledTimes(10);
	});

	it('should invoke onTick with the cron-scheduled fire time, not Date.now()', () => {
		// Freeze wall clock at an arbitrary instant that is NOT aligned to a minute boundary.
		const unaligned = new Date('2024-01-01T00:00:30.500Z');
		vi.setSystemTime(unaligned);

		scheduledTaskManager.registerCron(
			{
				workflowId: workflow.id,
				nodeId: 'test-node-id',
				timezone: workflow.timezone,
				expression: everyMinute,
			},
			onTick,
		);

		vi.advanceTimersByTime(60 * 1000);

		expect(onTick).toHaveBeenCalledTimes(1);
		const firstArg = onTick.mock.calls[0][0];
		expect(firstArg).toBeInstanceOf(Date);
		// The scheduled fire time should fall on a whole-second boundary aligned to the
		// cron expression (every minute at :00 seconds), NOT the unaligned wall-clock time.
		expect((firstArg as Date).getUTCMilliseconds()).toBe(0);
		expect((firstArg as Date).getUTCSeconds()).toBe(0);
		// And it should differ from the unaligned system time.
		expect((firstArg as Date).getTime()).not.toBe(unaligned.getTime());
	});

	it('should not register or invoke on follower instances', () => {
		cronRegistry = new CronRegistry(mock<InstanceSettings>({ isLeader: false }), logger, mock());
		scheduledTaskManager = new ScheduledTaskManager(cronRegistry);

		const ctx: CronContext = {
			workflowId: workflow.id,
			nodeId: 'test-node-id',
			timezone: workflow.timezone,
			expression: everyMinute,
		};

		const registered = scheduledTaskManager.registerCron(ctx, onTick);

		expect(registered).toBe(false);
		expect(scheduledTaskManager.hasCrons(workflow.id)).toBe(false);
		expect(onTick).not.toHaveBeenCalled();
		vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
		expect(onTick).not.toHaveBeenCalled();
	});

	it('should deregister CronJobs for a workflow', () => {
		const ctx1: CronContext = {
			workflowId: workflow.id,
			nodeId: 'test-node-id-1',
			timezone: workflow.timezone,
			expression: everyMinute,
		};
		const ctx2: CronContext = {
			workflowId: workflow.id,
			nodeId: 'test-node-id-2',
			timezone: workflow.timezone,
			expression: everyMinute,
		};
		const ctx3: CronContext = {
			workflowId: workflow.id,
			nodeId: 'test-node-id-3',
			timezone: workflow.timezone,
			expression: everyMinute,
		};

		scheduledTaskManager.registerCron(ctx1, onTick);
		scheduledTaskManager.registerCron(ctx2, onTick);
		scheduledTaskManager.registerCron(ctx3, onTick);

		expect(scheduledTaskManager.getCronNodeIds(workflow.id)).toHaveLength(3);

		scheduledTaskManager.deregisterCrons(workflow.id);

		expect(scheduledTaskManager.hasCrons(workflow.id)).toBe(false);

		expect(onTick).not.toHaveBeenCalled();
		vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
		expect(onTick).not.toHaveBeenCalled();
	});

	it('returns distinct node ids that currently have crons registered', () => {
		const everySecond = '* * * * * *';
		scheduledTaskManager.registerCron(
			{
				workflowId: workflow.id,
				nodeId: 'node-a',
				timezone: workflow.timezone,
				expression: everyMinute,
			},
			onTick,
		);
		// Two crons on the same node (e.g. multiple poll times) collapse to one id.
		scheduledTaskManager.registerCron(
			{
				workflowId: workflow.id,
				nodeId: 'node-a',
				timezone: workflow.timezone,
				expression: everySecond,
			},
			onTick,
		);
		scheduledTaskManager.registerCron(
			{
				workflowId: workflow.id,
				nodeId: 'node-b',
				timezone: workflow.timezone,
				expression: everyMinute,
			},
			onTick,
		);

		expect(scheduledTaskManager.getCronNodeIds(workflow.id).sort()).toEqual(['node-a', 'node-b']);
		expect(scheduledTaskManager.getCronNodeIds('unknown-workflow')).toEqual([]);
	});

	it('should deregister CronJobs for a single node, leaving other nodes intact', () => {
		const nodeA = 'node-a';
		const nodeB = 'node-b';

		scheduledTaskManager.registerCron(
			{
				workflowId: workflow.id,
				nodeId: nodeA,
				timezone: workflow.timezone,
				expression: everyMinute,
			},
			onTick,
		);
		scheduledTaskManager.registerCron(
			{
				workflowId: workflow.id,
				nodeId: nodeB,
				timezone: workflow.timezone,
				expression: everyMinute,
			},
			onTick,
		);

		expect(scheduledTaskManager.getCronNodeIds(workflow.id).sort()).toEqual([nodeA, nodeB]);

		scheduledTaskManager.deregisterCron(workflow.id, nodeA);

		expect(scheduledTaskManager.getCronNodeIds(workflow.id)).toEqual([nodeB]);
	});

	it('should drop the workflow entry once its last node cron is deregistered', () => {
		const nodeId = 'only-node';
		scheduledTaskManager.registerCron(
			{ workflowId: workflow.id, nodeId, timezone: workflow.timezone, expression: everyMinute },
			onTick,
		);

		scheduledTaskManager.deregisterCron(workflow.id, nodeId);

		expect(scheduledTaskManager.hasCrons(workflow.id)).toBe(false);
	});

	it('hasCrons reflects whether a workflow has registered crons', () => {
		expect(scheduledTaskManager.hasCrons(workflow.id)).toBe(false);

		scheduledTaskManager.registerCron(
			{
				workflowId: workflow.id,
				nodeId: 'n',
				timezone: workflow.timezone,
				expression: everyMinute,
			},
			onTick,
		);

		expect(scheduledTaskManager.hasCrons(workflow.id)).toBe(true);
	});

	it('should only deregister workflow crons when removing matching workflow crons', () => {
		const ownerId = 'shared-owner-id';
		scheduledTaskManager.registerCron(
			{
				workflowId: ownerId,
				nodeId: 'node-1',
				timezone: workflow.timezone,
				expression: everyMinute,
			},
			onTick,
		);
		cronRegistry.register(
			{
				namespace: 'other',
				ownerId,
				targetId: 'task-1',
				timezone: workflow.timezone,
				expression: everyMinute,
			},
			onTick,
		);

		scheduledTaskManager.deregisterCrons(ownerId);

		expect(scheduledTaskManager.hasCrons(ownerId)).toBe(false);
		expect(cronRegistry.hasOwner('other', ownerId)).toBe(true);
	});

	it('should only clear workflow crons on deregisterAllCrons', () => {
		const onOtherTick = vi.fn();
		scheduledTaskManager.registerCron(
			{
				workflowId: workflow.id,
				nodeId: 'node-1',
				timezone: workflow.timezone,
				expression: everyMinute,
			},
			onTick,
		);
		cronRegistry.register(
			{
				namespace: 'other',
				ownerId: 'owner-1',
				targetId: 'target-1',
				timezone: workflow.timezone,
				expression: everyMinute,
			},
			onOtherTick,
		);

		scheduledTaskManager.deregisterAllCrons();
		vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes

		expect(onTick).not.toHaveBeenCalled();
		expect(onOtherTick).toHaveBeenCalledTimes(10);
		expect(cronRegistry.hasOwner('other', 'owner-1')).toBe(true);
	});

	it('should not set up log interval when activeInterval is 0', () => {
		const configWithZeroInterval = mock({ activeInterval: 0 });
		const registry = new CronRegistry(instanceSettings, logger, configWithZeroInterval);

		// @ts-expect-error Private property
		expect(registry.logInterval).toBeUndefined();
	});
});
