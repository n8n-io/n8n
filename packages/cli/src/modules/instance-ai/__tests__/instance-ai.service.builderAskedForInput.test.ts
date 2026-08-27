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

import { TELEMETRY_EVENT } from '@n8n/telemetry';

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
			userId: string,
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

		service.trackConfirmationRequest('user-1', 'thread-a', {
			payload: { inputType: 'plan-review', planItems: [{}, {}, {}] },
		});

		expect(service.telemetry.track).toHaveBeenCalledWith(
			'Builder asked for input',
			expect.objectContaining({
				user_id: 'user-1',
				thread_id: 'thread-a',
				type: 'first_plan',
				num_steps: 3,
			}),
		);
	});

	it('marks later plan reviews in the same thread as revised_plan', () => {
		const service = makeService();

		service.trackConfirmationRequest('user-1', 'thread-a', {
			payload: { inputType: 'plan-review', planItems: [{}] },
		});
		service.trackConfirmationRequest('user-1', 'thread-a', {
			payload: { inputType: 'plan-review', planItems: [{}, {}] },
		});

		const calls = askedForInputCalls(service);
		expect(calls).toHaveLength(2);
		expect(calls[0]).toMatchObject({ type: 'first_plan', num_steps: 1 });
		expect(calls[1]).toMatchObject({ type: 'revised_plan', num_steps: 2 });
	});

	it('counts plans per thread independently', () => {
		const service = makeService();

		service.trackConfirmationRequest('user-1', 'thread-a', {
			payload: { inputType: 'plan-review', planItems: [{}] },
		});
		service.trackConfirmationRequest('user-1', 'thread-b', {
			payload: { inputType: 'plan-review', planItems: [{}] },
		});

		const calls = askedForInputCalls(service);
		expect(calls[0]).toMatchObject({ thread_id: 'thread-a', type: 'first_plan' });
		expect(calls[1]).toMatchObject({ thread_id: 'thread-b', type: 'first_plan' });
	});

	it('passes non-plan input types through unchanged and counts their steps', () => {
		const service = makeService();

		service.trackConfirmationRequest('user-1', 'thread-a', {
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

		service.trackConfirmationRequest('user-1', 'thread-a', {
			payload: { setupRequests: [{}, {}, {}] },
		});

		expect(service.telemetry.track).toHaveBeenCalledWith(
			'Builder asked for input',
			expect.objectContaining({ type: 'setup', num_steps: 3, contains_templated_cred: false }),
		);
	});

	it('flags credential setups that include a Templated Custom Auth request', () => {
		const service = makeService();

		service.trackConfirmationRequest('user-1', 'thread-a', {
			payload: {
				credentialRequests: [
					{ credentialType: 'httpHeaderAuth' },
					{ credentialType: 'httpTemplatedCustomAuth', setupHint: { template: {} } },
				],
			},
		});

		expect(service.telemetry.track).toHaveBeenCalledWith(
			'Builder asked for input',
			expect.objectContaining({
				type: 'credential-setup',
				num_steps: 2,
				contains_templated_cred: true,
			}),
		);
	});

	it('does not flag credential setups with only plain credential requests', () => {
		const service = makeService();

		service.trackConfirmationRequest('user-1', 'thread-a', {
			payload: { credentialRequests: [{ credentialType: 'httpHeaderAuth' }] },
		});

		expect(service.telemetry.track).toHaveBeenCalledWith(
			'Builder asked for input',
			expect.objectContaining({ type: 'credential-setup', contains_templated_cred: false }),
		);
	});

	it("emits 'Builder specced templated cred' with the recipe fields, once per recipe", () => {
		const service = makeService();
		const setupHint = {
			template: { headers: { Authorization: 'Key {{api_key}}' } },
			placeholders: [{ name: 'api_key', title: 'fal.ai API key', type: 'password' }],
			testUrl: 'https://api.fal.ai/v1/models/usage',
			docsUrl: 'https://fal.ai/dashboard/keys',
			serviceHost: 'fal.run',
		};

		service.trackConfirmationRequest('user-1', 'thread-a', {
			payload: {
				credentialRequests: [
					{ credentialType: 'httpHeaderAuth' },
					{ credentialType: 'httpTemplatedCustomAuth', setupHint },
				],
			},
		});

		expect(service.telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.BUILDER_SPECCED_TEMPLATED_CRED,
			{
				thread_id: 'thread-a',
				// a fresh nanoid, shared with the paired 'Builder asked for input' event
				input_thread_id: expect.any(String),
				template: setupHint.template,
				placeholders: setupHint.placeholders,
				test_url: setupHint.testUrl,
				docs_url: setupHint.docsUrl,
				service_host: setupHint.serviceHost,
				accepted_status_codes: undefined,
			},
		);
		const speccedCalls = service.telemetry.track.mock.calls.filter(
			([event]) => event === TELEMETRY_EVENT.INSTANCE_AI.BUILDER_SPECCED_TEMPLATED_CRED,
		);
		expect(speccedCalls).toHaveLength(1);
		// The emitted payload must satisfy the registry schema — the transport
		// only logs a warning on mismatch in production.
		expect(
			TELEMETRY_EVENT.INSTANCE_AI.BUILDER_SPECCED_TEMPLATED_CRED.getValidationError(
				speccedCalls[0][1],
			),
		).toBeNull();
	});

	it('does not emit the specced event for requests without a parseable recipe', () => {
		const service = makeService();

		service.trackConfirmationRequest('user-1', 'thread-a', {
			payload: {
				credentialRequests: [
					{ credentialType: 'httpHeaderAuth' },
					// malformed: placeholders must have at least one entry
					{ credentialType: 'httpTemplatedCustomAuth', setupHint: { template: {} } },
				],
			},
		});

		expect(service.telemetry.track).not.toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.BUILDER_SPECCED_TEMPLATED_CRED,
			expect.anything(),
		);
	});

	it('derives mcp-connect type and server count from an mcpConnectRequest', () => {
		const service = makeService();

		service.trackConfirmationRequest('user-1', 'thread-a', {
			payload: {
				mcpConnectRequest: {
					servers: [
						{ serverSlug: 'brave', title: 'Brave', credentialType: 'braveMcpOAuth2Api' },
						{ serverSlug: 'linear', title: 'Linear', credentialType: 'linearMcpOAuth2Api' },
					],
				},
			},
		});

		expect(service.telemetry.track).toHaveBeenCalledWith(
			'Builder asked for input',
			expect.objectContaining({ type: 'mcp-connect', num_steps: 2 }),
		);
	});

	it('falls back to approval when the payload carries no recognised request', () => {
		const service = makeService();

		service.trackConfirmationRequest('user-1', 'thread-a', { payload: {} });

		expect(service.telemetry.track).toHaveBeenCalledWith(
			'Builder asked for input',
			expect.objectContaining({ type: 'approval', num_steps: 1 }),
		);
	});
});
