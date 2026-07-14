import type { Mock } from 'vitest';
import type { z as zType } from 'zod';

// Manual mocks — must be declared before any imports that touch the mocked modules.
vi.mock('@n8n/instance-ai', async () => {
	const { z } = await vi.importActual<{ z: typeof zType }>('zod');
	return {
		McpClientManager: class {
			disconnect = vi.fn();
		},
		createDomainAccessTracker: vi.fn(),
		createSandbox: vi.fn(),
		createWorkspace: vi.fn(),
		createLazyRuntimeWorkspace: vi.fn(),
		createLazyWorkspaceRuntimeSkillSource: vi.fn(({ source }) => source),
		setupSandboxWorkspace: vi.fn(),
		loadInstanceAiRuntimeSkillSource: vi.fn(() => ({
			registry: { skillsHash: 'runtime-skills-hash', skills: [] },
			loadSkill: vi.fn(),
		})),
		disabledInstanceAiSkillIds: vi.fn(() => []),
		workflowBuildOutcomeSchema: z.object({}),
		handleBuildOutcome: vi.fn(),
		handleVerificationVerdict: vi.fn(),
		createInstanceAgent: vi.fn(),
		createAllTools: vi.fn(),
	};
});

import { InstanceAiService } from '../instance-ai.service';

/**
 * `trackConfirmationRequest` emits the 'Builder asked for input' telemetry event.
 * It classifies the input `type` and counts the relevant `num_steps`, and — for
 * plan reviews — distinguishes the first plan in a thread from later revisions
 * via the per-thread `planRequestsByThread` counter.
 */
describe('InstanceAiService — "Builder asked for input" telemetry', () => {
	type Internals = {
		planRequestsByThread: Map<string, number>;
		telemetry: { track: Mock };
		trackConfirmationRequest: (
			threadId: string,
			confirmationEvent: { payload: Record<string, unknown> },
		) => void;
	};

	function makeService(): Internals {
		// Bypass the constructor — we only exercise the counter map and telemetry.
		const service = Object.create(InstanceAiService.prototype) as unknown as Internals;
		service.planRequestsByThread = new Map<string, number>();
		service.telemetry = { track: vi.fn() };
		return service;
	}

	function askedForInputCalls(service: Internals): Array<Record<string, unknown>> {
		return service.telemetry.track.mock.calls
			.filter(([event]) => event === 'Builder asked for input')
			.map(([, payload]) => payload as Record<string, unknown>);
	}

	it('marks the first plan review in a thread as first_plan and counts plan items', () => {
		const service = makeService();

		service.trackConfirmationRequest('thread-a', {
			payload: { inputType: 'plan-review', planItems: [{}, {}, {}] },
		});

		expect(service.telemetry.track).toHaveBeenCalledWith(
			'Builder asked for input',
			expect.objectContaining({ thread_id: 'thread-a', type: 'first_plan', num_steps: 3 }),
		);
	});

	it('marks later plan reviews in the same thread as revised_plan', () => {
		const service = makeService();

		service.trackConfirmationRequest('thread-a', {
			payload: { inputType: 'plan-review', planItems: [{}] },
		});
		service.trackConfirmationRequest('thread-a', {
			payload: { inputType: 'plan-review', planItems: [{}, {}] },
		});

		const calls = askedForInputCalls(service);
		expect(calls).toHaveLength(2);
		expect(calls[0]).toMatchObject({ type: 'first_plan', num_steps: 1 });
		expect(calls[1]).toMatchObject({ type: 'revised_plan', num_steps: 2 });
	});

	it('counts plans per thread independently', () => {
		const service = makeService();

		service.trackConfirmationRequest('thread-a', {
			payload: { inputType: 'plan-review', planItems: [{}] },
		});
		service.trackConfirmationRequest('thread-b', {
			payload: { inputType: 'plan-review', planItems: [{}] },
		});

		const calls = askedForInputCalls(service);
		expect(calls[0]).toMatchObject({ thread_id: 'thread-a', type: 'first_plan' });
		expect(calls[1]).toMatchObject({ thread_id: 'thread-b', type: 'first_plan' });
	});

	it('passes non-plan input types through unchanged and counts their steps', () => {
		const service = makeService();

		service.trackConfirmationRequest('thread-a', {
			payload: { inputType: 'questions', questions: [{}, {}] },
		});

		expect(service.telemetry.track).toHaveBeenCalledWith(
			'Builder asked for input',
			expect.objectContaining({ type: 'questions', num_steps: 2 }),
		);
		expect(service.planRequestsByThread.has('thread-a')).toBe(false);
	});

	it('derives setup type from setupRequests when no inputType is present', () => {
		const service = makeService();

		service.trackConfirmationRequest('thread-a', {
			payload: { setupRequests: [{}, {}, {}] },
		});

		expect(service.telemetry.track).toHaveBeenCalledWith(
			'Builder asked for input',
			expect.objectContaining({ type: 'setup', num_steps: 3 }),
		);
	});
});
