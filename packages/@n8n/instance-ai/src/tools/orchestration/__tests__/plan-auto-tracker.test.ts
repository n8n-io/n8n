import type { InstanceAiEvent, PlanObject } from '@n8n/api-types';

import type { InstanceAiEventBus } from '../../../event-bus/event-bus.interface';
import type { IterationLog } from '../../../storage/iteration-log';
import type { PlanStorage } from '../../../types';
import { PlanAutoTracker } from '../plan-auto-tracker';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockEventBus() {
	const listeners: Array<(stored: { event: InstanceAiEvent }) => void> = [];
	return {
		publish: jest.fn(),
		subscribe: jest.fn(
			(_threadId: string, handler: (stored: { event: InstanceAiEvent }) => void) => {
				listeners.push(handler);
				return () => {
					const idx = listeners.indexOf(handler);
					if (idx >= 0) listeners.splice(idx, 1);
				};
			},
		),
		getEventsAfter: jest.fn(),
		getNextEventId: jest.fn(),
		getEventsForRun: jest.fn().mockReturnValue([]),
		emit(event: InstanceAiEvent) {
			for (const handler of listeners) handler({ event });
		},
	} satisfies InstanceAiEventBus & { emit: (e: InstanceAiEvent) => void };
}

function createMockPlanStorage(plan: PlanObject | null = null) {
	return {
		get: jest.fn<Promise<PlanObject | null>, [string]>().mockResolvedValue(plan),
		save: jest.fn<Promise<void>, [string, PlanObject]>().mockResolvedValue(undefined),
	} satisfies PlanStorage;
}

function createMockIterationLog(): jest.Mocked<IterationLog> {
	return {
		append: jest.fn().mockResolvedValue(undefined),
		getForTask: jest.fn().mockResolvedValue([]),
		clear: jest.fn().mockResolvedValue(undefined),
	};
}

function createTestPlan(
	steps: Array<{
		phase: string;
		description: string;
		status: string;
		toolCallId?: string;
	}>,
): PlanObject {
	return {
		goal: 'test goal',
		currentPhase: 'build',
		iteration: 0,
		steps: steps.map((s) => ({
			phase: s.phase,
			description: s.description,
			status: s.status as 'pending' | 'in_progress' | 'completed' | 'failed',
			toolCallId: s.toolCallId,
		})),
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const THREAD_ID = 'test-thread';
const RUN_ID = 'test-run';
const AGENT_ID = 'agent-001';

describe('PlanAutoTracker', () => {
	describe('iteration log capture on failure', () => {
		it('appends to iteration log when a tracked tool result is an error', async () => {
			const plan = createTestPlan([
				{ phase: 'build', description: 'Build Gmail workflow', status: 'pending' },
			]);
			const planStorage = createMockPlanStorage(plan);
			const iterationLog = createMockIterationLog();
			const eventBus = createMockEventBus();

			const tracker = new PlanAutoTracker(
				THREAD_ID,
				RUN_ID,
				AGENT_ID,
				eventBus,
				planStorage,
				iterationLog,
			);
			tracker.start();

			// Simulate tool-call
			eventBus.emit({
				type: 'tool-call',
				runId: RUN_ID,
				agentId: AGENT_ID,
				payload: { toolCallId: 'tc-1', toolName: 'build-workflow-with-agent', args: {} },
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			// Simulate tool-result with error
			eventBus.emit({
				type: 'tool-result',
				runId: RUN_ID,
				agentId: AGENT_ID,
				payload: { toolCallId: 'tc-1', result: 'Sub-agent error: invalid_auth' },
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(iterationLog.append).toHaveBeenCalled();
			const appendCall = iterationLog.append.mock.calls[0];
			expect(appendCall[0]).toBe(THREAD_ID);
			expect(typeof appendCall[1]).toBe('string');
			expect(appendCall[2].attempt).toBe(1);
			expect(appendCall[2].action).toBe('build-workflow-with-agent');
			expect(appendCall[2].error).toContain('error');

			tracker.stop();
		});

		it('does not append to iteration log on successful tool result', async () => {
			const plan = createTestPlan([
				{ phase: 'build', description: 'Build Gmail workflow', status: 'pending' },
			]);
			const planStorage = createMockPlanStorage(plan);
			const iterationLog = createMockIterationLog();
			const eventBus = createMockEventBus();

			const tracker = new PlanAutoTracker(
				THREAD_ID,
				RUN_ID,
				AGENT_ID,
				eventBus,
				planStorage,
				iterationLog,
			);
			tracker.start();

			eventBus.emit({
				type: 'tool-call',
				runId: RUN_ID,
				agentId: AGENT_ID,
				payload: { toolCallId: 'tc-1', toolName: 'delegate', args: {} },
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			eventBus.emit({
				type: 'tool-result',
				runId: RUN_ID,
				agentId: AGENT_ID,
				payload: { toolCallId: 'tc-1', result: 'Workflow ran successfully' },
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(iterationLog.append).not.toHaveBeenCalled();

			tracker.stop();
		});
	});

	describe('auto-insert verify step after build', () => {
		it('inserts a verify step after a successful build-workflow-with-agent', async () => {
			const plan = createTestPlan([
				{ phase: 'build', description: 'Build Gmail → Slack workflow', status: 'pending' },
				{ phase: 'build', description: 'Build another workflow', status: 'pending' },
			]);
			const planStorage = createMockPlanStorage(plan);
			const eventBus = createMockEventBus();

			const tracker = new PlanAutoTracker(THREAD_ID, RUN_ID, AGENT_ID, eventBus, planStorage);
			tracker.start();

			eventBus.emit({
				type: 'tool-call',
				runId: RUN_ID,
				agentId: AGENT_ID,
				payload: { toolCallId: 'tc-1', toolName: 'build-workflow-with-agent', args: {} },
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			eventBus.emit({
				type: 'tool-result',
				runId: RUN_ID,
				agentId: AGENT_ID,
				payload: { toolCallId: 'tc-1', result: 'Workflow created successfully' },
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			// Plan should have been saved with the verify step inserted
			const saveCalls = planStorage.save.mock.calls;
			const lastSaveCall = saveCalls[saveCalls.length - 1];
			expect(lastSaveCall).toBeDefined();
			const savedPlan = lastSaveCall[1];
			expect(savedPlan.steps).toHaveLength(3);
			expect(savedPlan.steps[1].description.toLowerCase()).toContain('verify');
			expect(savedPlan.steps[1].phase).toBe('execute');
			expect(savedPlan.steps[1].status).toBe('pending');

			tracker.stop();
		});

		it('does not insert verify step if one already follows', async () => {
			const plan = createTestPlan([
				{ phase: 'build', description: 'Build workflow', status: 'pending' },
				{ phase: 'execute', description: 'Verify workflow', status: 'pending' },
			]);
			const planStorage = createMockPlanStorage(plan);
			const eventBus = createMockEventBus();

			const tracker = new PlanAutoTracker(THREAD_ID, RUN_ID, AGENT_ID, eventBus, planStorage);
			tracker.start();

			eventBus.emit({
				type: 'tool-call',
				runId: RUN_ID,
				agentId: AGENT_ID,
				payload: { toolCallId: 'tc-1', toolName: 'build-workflow-with-agent', args: {} },
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			eventBus.emit({
				type: 'tool-result',
				runId: RUN_ID,
				agentId: AGENT_ID,
				payload: { toolCallId: 'tc-1', result: 'Workflow created' },
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			// Should still have 2 steps, not 3
			const saveCalls = planStorage.save.mock.calls;
			const lastSaveCall = saveCalls[saveCalls.length - 1];
			expect(lastSaveCall).toBeDefined();
			const savedPlan = lastSaveCall[1];
			expect(savedPlan.steps).toHaveLength(2);

			tracker.stop();
		});
	});
});
