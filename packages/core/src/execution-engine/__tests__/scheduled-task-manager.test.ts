import type { Logger } from '@n8n/backend-common';
import type { CronLoggingConfig } from '@n8n/config';
import type { Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { InstanceSettings } from '@/instance-settings';

import {
	ScheduledTaskManager,
	type ScheduledTaskContext,
	type ScheduledTaskGroup,
} from '../scheduled-task-manager';

const logger = mock<Logger>({ scoped: vi.fn().mockReturnValue(mock<Logger>()) });

describe('ScheduledTaskManager', () => {
	const workflow = mock<Workflow>({ id: 'workflow-1', timezone: 'GMT' });
	const everyMinute = '0 * * * * *';

	const onTick = vi.fn();

	let scheduledTaskManager: ScheduledTaskManager;

	const workflowGroup = (id = workflow.id): ScheduledTaskGroup => ({ type: 'workflow', id });
	const agentTaskGroup = (id = 'agent-1'): ScheduledTaskGroup => ({ type: 'agent-task', id });

	const cronContext = (overrides: Partial<ScheduledTaskContext> = {}): ScheduledTaskContext => ({
		group: workflowGroup(),
		targetId: 'test-node-id',
		timezone: workflow.timezone,
		expression: everyMinute,
		...overrides,
	});

	const makeManager = (
		isLeader = true,
		config: CronLoggingConfig = mock<CronLoggingConfig>({ activeInterval: 0 }),
	) =>
		new ScheduledTaskManager(
			mock<InstanceSettings>({ isLeader, instanceRole: isLeader ? 'leader' : 'follower' }),
			logger,
			config,
		);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		scheduledTaskManager = makeManager();
	});

	afterEach(() => {
		scheduledTaskManager.deregisterGroups('workflow');
		scheduledTaskManager.deregisterGroups('agent-task');
		scheduledTaskManager.deregisterGroups('other');
		vi.useRealTimers();
	});

	it('does not register duplicate cron contexts', () => {
		const ctx = cronContext();

		expect(scheduledTaskManager.register(ctx, onTick)).toBe(true);
		expect(scheduledTaskManager.register(ctx, onTick)).toBe(false);

		expect(scheduledTaskManager.getTargetIds(ctx.group)).toEqual(['test-node-id']);
	});

	it('does not fire duplicate cron contexts twice', () => {
		const ctx = cronContext();

		scheduledTaskManager.register(ctx, onTick);
		scheduledTaskManager.register(ctx, onTick);
		vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes

		expect(onTick).toHaveBeenCalledTimes(10);
	});

	it('should throw when workflow timezone is invalid', () => {
		expect(() =>
			scheduledTaskManager.register(cronContext({ timezone: 'somewhere' }), onTick),
		).toThrow('Invalid timezone.');
	});

	it('should throw when cron expression is invalid', () => {
		expect(() =>
			scheduledTaskManager.register(cronContext({ expression: 'invalid-cron-expression' }), onTick),
		).toThrow();
	});

	it('should register valid CronJobs', () => {
		scheduledTaskManager.register(cronContext(), onTick);

		expect(onTick).not.toHaveBeenCalled();
		vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
		expect(onTick).toHaveBeenCalledTimes(10);
	});

	it('should invoke onTick with the cron-scheduled fire time, not Date.now()', () => {
		// Freeze wall clock at an arbitrary instant that is NOT aligned to a minute boundary.
		const unaligned = new Date('2024-01-01T00:00:30.500Z');
		vi.setSystemTime(unaligned);

		scheduledTaskManager.register(cronContext(), onTick);

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
		scheduledTaskManager = makeManager(false);

		const ctx = cronContext();
		const registered = scheduledTaskManager.register(ctx, onTick);

		expect(registered).toBe(false);
		expect(scheduledTaskManager.hasGroup(ctx.group)).toBe(false);
		expect(onTick).not.toHaveBeenCalled();
		vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
		expect(onTick).not.toHaveBeenCalled();
	});

	it('should deregister CronJobs for a group', () => {
		const ctx1 = cronContext({ targetId: 'test-node-id-1' });
		const ctx2 = cronContext({ targetId: 'test-node-id-2' });
		const ctx3 = cronContext({ targetId: 'test-node-id-3' });

		scheduledTaskManager.register(ctx1, onTick);
		scheduledTaskManager.register(ctx2, onTick);
		scheduledTaskManager.register(ctx3, onTick);

		expect(scheduledTaskManager.getTargetIds(workflowGroup())).toHaveLength(3);

		expect(scheduledTaskManager.deregisterGroup(workflowGroup())).toBe(true);

		expect(scheduledTaskManager.hasGroup(workflowGroup())).toBe(false);

		expect(onTick).not.toHaveBeenCalled();
		vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
		expect(onTick).not.toHaveBeenCalled();
	});

	it('returns distinct target ids that currently have crons registered for a group', () => {
		const everySecond = '* * * * * *';
		scheduledTaskManager.register(cronContext({ targetId: 'node-a' }), onTick);
		// Two crons on the same target (e.g. multiple poll times) collapse to one id.
		scheduledTaskManager.register(
			cronContext({ targetId: 'node-a', expression: everySecond }),
			onTick,
		);
		scheduledTaskManager.register(cronContext({ targetId: 'node-b' }), onTick);

		expect(scheduledTaskManager.getTargetIds(workflowGroup()).sort()).toEqual(['node-a', 'node-b']);
		expect(scheduledTaskManager.getTargetIds(workflowGroup('unknown-workflow'))).toEqual([]);
	});

	it('should deregister CronJobs for a single target, leaving other targets intact', () => {
		const nodeA = 'node-a';
		const nodeB = 'node-b';

		scheduledTaskManager.register(cronContext({ targetId: nodeA }), onTick);
		scheduledTaskManager.register(cronContext({ targetId: nodeB }), onTick);

		expect(scheduledTaskManager.getTargetIds(workflowGroup()).sort()).toEqual([nodeA, nodeB]);

		scheduledTaskManager.deregisterTarget(workflowGroup(), nodeA);

		expect(scheduledTaskManager.getTargetIds(workflowGroup())).toEqual([nodeB]);
	});

	it('should drop the group entry once its last target cron is deregistered', () => {
		const nodeId = 'only-node';
		scheduledTaskManager.register(cronContext({ targetId: nodeId }), onTick);

		scheduledTaskManager.deregisterTarget(workflowGroup(), nodeId);

		expect(scheduledTaskManager.hasGroup(workflowGroup())).toBe(false);
	});

	it('hasGroup reflects whether a group has registered crons', () => {
		expect(scheduledTaskManager.hasGroup(workflowGroup())).toBe(false);

		scheduledTaskManager.register(cronContext({ targetId: 'n' }), onTick);

		expect(scheduledTaskManager.hasGroup(workflowGroup())).toBe(true);
	});

	it('hasTarget reflects whether a target has registered crons in a group', () => {
		scheduledTaskManager.register(cronContext({ targetId: 'target-1' }), onTick);

		expect(scheduledTaskManager.hasTarget(workflowGroup(), 'target-1')).toBe(true);
		expect(scheduledTaskManager.hasTarget(workflowGroup(), 'target-2')).toBe(false);
	});

	it('should only deregister matching group crons when removing a group', () => {
		const sharedGroupId = 'shared-group-id';
		const workflow = workflowGroup(sharedGroupId);
		const other = { type: 'other', id: sharedGroupId };

		scheduledTaskManager.register(cronContext({ group: workflow, targetId: 'node-1' }), onTick);
		scheduledTaskManager.register(cronContext({ group: other, targetId: 'task-1' }), onTick);

		scheduledTaskManager.deregisterGroup(workflow);

		expect(scheduledTaskManager.hasGroup(workflow)).toBe(false);
		expect(scheduledTaskManager.hasGroup(other)).toBe(true);
	});

	it('should only clear matching group type crons on deregisterGroups', () => {
		const onOtherTick = vi.fn();
		const otherGroup = { type: 'other', id: 'group-1' };
		scheduledTaskManager.register(
			cronContext({ group: workflowGroup(), targetId: 'node-1' }),
			onTick,
		);
		scheduledTaskManager.register(
			cronContext({ group: otherGroup, targetId: 'target-1' }),
			onOtherTick,
		);

		scheduledTaskManager.deregisterGroups('workflow');
		vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes

		expect(onTick).not.toHaveBeenCalled();
		expect(onOtherTick).toHaveBeenCalledTimes(10);
		expect(scheduledTaskManager.hasGroup(otherGroup)).toBe(true);
	});

	it('supports agent task groups', () => {
		const group = agentTaskGroup();
		scheduledTaskManager.register(cronContext({ group, targetId: 'task-1' }), onTick);
		scheduledTaskManager.register(cronContext({ group, targetId: 'task-2' }), onTick);

		expect(scheduledTaskManager.getTargetIds(group).sort()).toEqual(['task-1', 'task-2']);
		expect(scheduledTaskManager.hasTarget(group, 'task-1')).toBe(true);

		scheduledTaskManager.deregisterTarget(group, 'task-1');

		expect(scheduledTaskManager.getTargetIds(group)).toEqual(['task-2']);
		expect(scheduledTaskManager.deregisterGroup(group)).toBe(true);
		expect(scheduledTaskManager.hasGroup(group)).toBe(false);
	});

	it('should clear all agent task groups without touching workflow groups', () => {
		const workflow = workflowGroup('shared-id');
		const agentTask = agentTaskGroup('shared-id');
		scheduledTaskManager.register(cronContext({ group: workflow, targetId: 'node-1' }), onTick);
		scheduledTaskManager.register(cronContext({ group: agentTask, targetId: 'task-1' }), onTick);

		scheduledTaskManager.deregisterGroups('agent-task');

		expect(scheduledTaskManager.hasGroup(agentTask)).toBe(false);
		expect(scheduledTaskManager.hasGroup(workflow)).toBe(true);
	});

	it('should not set up log interval when activeInterval is 0', () => {
		const configWithZeroInterval = mock<CronLoggingConfig>({ activeInterval: 0 });
		const manager = makeManager(true, configWithZeroInterval);

		// @ts-expect-error Private property
		expect(manager.logInterval).toBeUndefined();
	});
});
