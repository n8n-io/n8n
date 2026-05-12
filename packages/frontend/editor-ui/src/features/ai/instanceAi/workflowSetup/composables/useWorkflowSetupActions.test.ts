import { computed, nextTick, ref, type ComputedRef, type Ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowSetupSection, WorkflowSetupStep } from '../workflowSetup.types';
import { makeWorkflowSetupSection } from '../__tests__/factories';
import { useWorkflowSetupActions } from './useWorkflowSetupActions';

const telemetryTrack = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

const rootStoreState = { instanceId: 'instance-1' };
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => rootStoreState,
}));

interface Harness {
	sectionA: WorkflowSetupSection;
	sectionB: WorkflowSetupSection;
	sections: ComputedRef<WorkflowSetupSection[]>;
	steps: ComputedRef<WorkflowSetupStep[]>;
	currentStepIndex: Ref<number>;
	isReady: Ref<boolean>;
	activeStep: ComputedRef<WorkflowSetupStep | undefined>;
	completedSet: Set<string>;
	skippedSet: Set<string>;
	credentialSelections: Ref<Record<string, Record<string, string>>>;
	skippedSectionIds: Ref<Set<string>>;
	goToStep: ReturnType<typeof vi.fn>;
	apply: ReturnType<typeof vi.fn>;
	defer: ReturnType<typeof vi.fn>;
	markSectionSkipped: ReturnType<typeof vi.fn>;
	buildCompletedSetupPayload: ReturnType<typeof vi.fn>;
	thread: { currentThreadId: string; findToolCallByRequestId: ReturnType<typeof vi.fn> };
	actions: ReturnType<typeof useWorkflowSetupActions>;
}

function setupHarness(): Harness {
	const sectionA = makeWorkflowSetupSection({
		id: 'A:typeA',
		targetNodeName: 'A',
		credentialType: 'typeA',
	});
	const sectionB = makeWorkflowSetupSection({
		id: 'B:typeB',
		targetNodeName: 'B',
		credentialType: 'typeB',
	});
	const sections = computed(() => [sectionA, sectionB]);
	const steps = computed<WorkflowSetupStep[]>(() => [
		{ kind: 'section', section: sectionA },
		{ kind: 'section', section: sectionB },
	]);
	const currentStepIndex = ref(0);
	const isReady = ref(true);
	const activeStep = computed<WorkflowSetupStep | undefined>(
		() => steps.value[currentStepIndex.value],
	);

	const completedSet = new Set<string>();
	const skippedSet = new Set<string>();
	const credentialSelections = ref<Record<string, Record<string, string>>>({});
	const skippedSectionIds = ref<Set<string>>(skippedSet);

	const goToStep = vi.fn((idx: number) => {
		currentStepIndex.value = idx;
	});
	const apply = vi.fn().mockResolvedValue(undefined);
	const defer = vi.fn().mockResolvedValue(undefined);
	const markSectionSkipped = vi.fn((section: WorkflowSetupSection) => {
		skippedSet.add(section.id);
		skippedSectionIds.value = new Set(skippedSet);
	});
	const buildCompletedSetupPayload = vi.fn(() => {
		const out: Record<string, Record<string, string>> = {};
		for (const section of sections.value) {
			if (completedSet.has(section.id) && section.credentialType) {
				out[section.targetNodeName] = {
					...(out[section.targetNodeName] ?? {}),
					[section.credentialType]: 'cred-id',
				};
			}
		}
		return { nodeCredentials: out };
	});

	const thread = {
		currentThreadId: 'thread-1',
		findToolCallByRequestId: vi.fn(() => ({
			confirmation: { inputThreadId: 'input-thread-1' },
		})),
	};

	const actions = useWorkflowSetupActions({
		requestId: ref('req-1'),
		sections,
		steps,
		activeStep,
		currentStepIndex,
		isReady,
		goToStep,
		inputs: {
			credentialSelections,
			isSectionComplete: (section) => completedSet.has(section.id),
			isSectionSkipped: (section) => skippedSet.has(section.id),
			markSectionSkipped,
			buildCompletedSetupPayload,
		},
		applyMachine: { apply, defer },
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		thread: thread as any,
	});

	return {
		sectionA,
		sectionB,
		sections,
		steps,
		currentStepIndex,
		isReady,
		activeStep,
		completedSet,
		skippedSet,
		credentialSelections,
		skippedSectionIds,
		goToStep,
		apply,
		defer,
		markSectionSkipped,
		buildCompletedSetupPayload,
		thread,
		actions,
	};
}

function getTelemetryCalls(eventName: string) {
	return telemetryTrack.mock.calls.filter(([event]) => event === eventName);
}

describe('useWorkflowSetupActions', () => {
	beforeEach(() => {
		telemetryTrack.mockReset();
	});

	it('tracks the active setup step when it is shown', () => {
		setupHarness();
		const shownPayload = getTelemetryCalls('Instance AI workflow setup step shown')[0]?.[1];

		expect(telemetryTrack).toHaveBeenCalledWith(
			'Instance AI workflow setup step shown',
			expect.objectContaining({
				thread_id: 'thread-1',
				input_thread_id: 'input-thread-1',
				instance_id: 'instance-1',
				type: 'setup',
				request_id: 'req-1',
				step_index: 1,
				step_count: 2,
				step_kind: 'section',
				setup_inputs: [
					expect.objectContaining({
						input_type: 'credential',
						node_type: 'n8n-nodes-base.httpRequest',
						credential_type: 'typeA',
					}),
				],
			}),
		);
		expect(shownPayload).toEqual(expect.not.objectContaining({ sections: expect.anything() }));
		expect(shownPayload.setup_inputs[0]).toEqual(
			expect.not.objectContaining({
				node_name: expect.anything(),
				credential_target_nodes: expect.anything(),
				label: expect.anything(),
			}),
		);
	});

	it('marks the active section skipped and advances to the next unhandled step without calling the API', async () => {
		const h = setupHarness();

		await h.actions.skipCurrentStep();

		expect(h.markSectionSkipped).toHaveBeenCalledWith(h.sectionA);
		expect(h.goToStep).toHaveBeenCalledWith(1);
		expect(h.apply).not.toHaveBeenCalled();
		expect(h.defer).not.toHaveBeenCalled();
		expect(getTelemetryCalls('User finished providing input')).toHaveLength(0);
		expect(telemetryTrack).toHaveBeenCalledWith(
			'Instance AI workflow setup step handled',
			expect.objectContaining({
				outcome: 'skipped',
			}),
		);
	});

	it('routes through partial apply when terminal skip happens with at least one completion', async () => {
		const h = setupHarness();
		// section A is completed (with a real selection so telemetry can read it),
		// section B is the active one and the only unhandled step.
		h.completedSet.add(h.sectionA.id);
		h.credentialSelections.value = { A: { typeA: 'cred-id' } };
		h.currentStepIndex.value = 1;
		await nextTick();

		await h.actions.skipCurrentStep();

		expect(h.markSectionSkipped).toHaveBeenCalledWith(h.sectionB);
		expect(h.apply).toHaveBeenCalledWith({ nodeCredentials: { A: { typeA: 'cred-id' } } });
		expect(h.defer).not.toHaveBeenCalled();
		expect(getTelemetryCalls('User finished providing input')).toHaveLength(1);
		expect(telemetryTrack).toHaveBeenCalledWith(
			'User finished providing input',
			expect.objectContaining({
				type: 'setup',
				explicitly_skipped_inputs: [{ label: 'n8n-nodes-base.httpRequest - typeB', options: [] }],
				provided_inputs: [
					expect.objectContaining({
						label: 'n8n-nodes-base.httpRequest - typeA',
						option_chosen: 'true',
					}),
				],
			}),
		);
	});

	it('routes through defer when terminal skip happens with zero completions', async () => {
		const h = setupHarness();
		// pre-skip section A so section B is the only unhandled step on a fresh skip.
		h.skippedSet.add(h.sectionA.id);
		h.skippedSectionIds.value = new Set(h.skippedSet);
		h.currentStepIndex.value = 1;
		await nextTick();

		await h.actions.skipCurrentStep();

		expect(h.markSectionSkipped).toHaveBeenCalledWith(h.sectionB);
		expect(h.defer).toHaveBeenCalledTimes(1);
		expect(h.apply).not.toHaveBeenCalled();
	});

	it('does not skip a section with selected-but-not-complete credential into a partial apply', async () => {
		const h = setupHarness();
		// pre-skip section A so section B is the active and only unhandled step,
		// section B has a selection that hasn't completed (e.g. cred test pending).
		h.skippedSet.add(h.sectionA.id);
		h.skippedSectionIds.value = new Set(h.skippedSet);
		h.credentialSelections.value = { B: { typeB: 'cred-id-pending' } };
		h.currentStepIndex.value = 1;
		await nextTick();

		await h.actions.skipCurrentStep();

		// B is not complete, A is skipped → no completed sections → defer path.
		expect(h.defer).toHaveBeenCalledTimes(1);
		expect(h.apply).not.toHaveBeenCalled();
	});

	it('routes back to an earlier unhandled step when current is later', async () => {
		const h = setupHarness();
		// User manually navigated to step B without handling step A.
		h.currentStepIndex.value = 1;
		await nextTick();

		await h.actions.skipCurrentStep();

		expect(h.markSectionSkipped).toHaveBeenCalledWith(h.sectionB);
		// Step A is still unhandled → wizard should route back to it.
		expect(h.goToStep).toHaveBeenCalledWith(0);
		expect(h.apply).not.toHaveBeenCalled();
		expect(h.defer).not.toHaveBeenCalled();
	});

	it('guards against rapid double-clicks via isActionPending', async () => {
		const h = setupHarness();
		// Make apply take a tick.
		let resolveApply: () => void = () => {};
		h.apply.mockReturnValueOnce(
			new Promise<void>((r) => {
				resolveApply = r;
			}),
		);
		h.completedSet.add(h.sectionA.id);
		h.currentStepIndex.value = 1;
		await nextTick();

		// First call → terminal skip, schedules apply (pending).
		const first = h.actions.skipCurrentStep();
		// Concurrent call should be ignored.
		const second = h.actions.skipCurrentStep();

		await second; // returns immediately — guard short-circuits
		expect(h.apply).toHaveBeenCalledTimes(1);

		resolveApply();
		await first;
		expect(h.apply).toHaveBeenCalledTimes(1);
	});

	it('nextUnhandledIndex skips both complete and skipped steps', async () => {
		const h = setupHarness();
		h.completedSet.add(h.sectionA.id);
		h.skippedSet.add(h.sectionB.id);
		h.skippedSectionIds.value = new Set(h.skippedSet);
		await nextTick();

		expect(h.actions.nextUnhandledIndex.value).toBe(-1);
		expect(h.actions.hasOtherUnhandledSteps.value).toBe(false);
	});

	it('apply() reports completed sections via partial credential map and tracks telemetry', async () => {
		const h = setupHarness();
		h.completedSet.add(h.sectionA.id);

		await h.actions.apply();

		expect(h.apply).toHaveBeenCalledWith({ nodeCredentials: { A: { typeA: 'cred-id' } } });
		expect(getTelemetryCalls('User finished providing input')).toHaveLength(1);
		expect(telemetryTrack).toHaveBeenCalledWith(
			'Instance AI workflow setup step handled',
			expect.objectContaining({
				outcome: 'completed',
			}),
		);
	});

	it('tracks both credential and parameter inputs for a completed mixed section', async () => {
		const h = setupHarness();
		h.sectionA.parameterNames = ['url', 'method'];
		h.completedSet.add(h.sectionA.id);
		h.credentialSelections.value = { A: { typeA: 'cred-id' } };

		await h.actions.apply();

		expect(telemetryTrack).toHaveBeenCalledWith(
			'User finished providing input',
			expect.objectContaining({
				provided_inputs: [
					{
						label: 'n8n-nodes-base.httpRequest - typeA',
						options: [],
						option_chosen: 'true',
					},
					{
						label: 'n8n-nodes-base.httpRequest - url',
						options: [],
						option_chosen: 'true',
					},
					{
						label: 'n8n-nodes-base.httpRequest - method',
						options: [],
						option_chosen: 'true',
					},
				],
				num_tasks: 2,
			}),
		);
	});

	describe('group steps', () => {
		it('skips only incomplete sections in a group, preserving complete ones', async () => {
			const sectionA = makeWorkflowSetupSection({
				id: 'Sub1:credA',
				targetNodeName: 'Sub1',
				credentialType: 'credA',
			});
			const sectionB = makeWorkflowSetupSection({
				id: 'Sub2:credB',
				targetNodeName: 'Sub2',
				credentialType: 'credB',
			});
			const sections = computed(() => [sectionA, sectionB]);
			const steps = computed<WorkflowSetupStep[]>(() => [
				{
					kind: 'group',
					group: {
						subnodeRootNode: { name: 'Agent', type: 'agent', typeVersion: 1, id: 'agent-1' },
						subnodeSections: [sectionA, sectionB],
					},
				},
			]);
			const currentStepIndex = ref(0);
			const activeStep = computed<WorkflowSetupStep | undefined>(() => steps.value[0]);

			const completedSet = new Set<string>([sectionA.id]);
			const skippedSet = new Set<string>();
			const credentialSelections = ref<Record<string, Record<string, string>>>({
				Sub1: { credA: 'cred-a' },
			});
			const skippedSectionIds = ref<Set<string>>(skippedSet);
			const isReady = ref(true);
			const goToStep = vi.fn();
			const apply = vi.fn().mockResolvedValue(undefined);
			const defer = vi.fn().mockResolvedValue(undefined);
			const markSectionSkipped = vi.fn((section: WorkflowSetupSection) => {
				skippedSet.add(section.id);
				skippedSectionIds.value = new Set(skippedSet);
			});
			const buildCompletedSetupPayload = vi.fn(() => ({
				nodeCredentials: { Sub1: { credA: 'cred-a' } },
			}));

			const thread = {
				currentThreadId: 'thread-1',
				findToolCallByRequestId: vi.fn(() => ({
					confirmation: { inputThreadId: 'input-thread-1' },
				})),
			};

			const actions = useWorkflowSetupActions({
				requestId: ref('req-1'),
				sections,
				steps,
				activeStep,
				currentStepIndex,
				isReady,
				goToStep,
				inputs: {
					credentialSelections,
					isSectionComplete: (section) => completedSet.has(section.id),
					isSectionSkipped: (section) => skippedSet.has(section.id),
					markSectionSkipped,
					buildCompletedSetupPayload,
				},
				applyMachine: { apply, defer },
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				thread: thread as any,
			});

			await actions.skipCurrentStep();

			// Only the incomplete sectionB was marked skipped — sectionA remains complete.
			expect(markSectionSkipped).toHaveBeenCalledTimes(1);
			expect(markSectionSkipped).toHaveBeenCalledWith(sectionB);
			// Terminal — only one step. apply runs since at least one section is complete.
			expect(apply).toHaveBeenCalledWith({ nodeCredentials: { Sub1: { credA: 'cred-a' } } });
			expect(telemetryTrack).toHaveBeenCalledWith(
				'Instance AI workflow setup step handled',
				expect.objectContaining({
					step_kind: 'group',
					outcome: 'mixed',
					setup_inputs: [
						expect.objectContaining({
							input_type: 'credential',
							node_type: 'n8n-nodes-base.httpRequest',
							credential_type: 'credA',
						}),
						expect.objectContaining({
							input_type: 'credential',
							node_type: 'n8n-nodes-base.httpRequest',
							credential_type: 'credB',
						}),
					],
				}),
			);
		});

		it('reports group step as handled when every member is complete or skipped', () => {
			const sectionA = makeWorkflowSetupSection({
				id: 'Sub1:credA',
				targetNodeName: 'Sub1',
				credentialType: 'credA',
			});
			const sectionB = makeWorkflowSetupSection({
				id: 'Sub2:credB',
				targetNodeName: 'Sub2',
				credentialType: 'credB',
			});
			const sections = computed(() => [sectionA, sectionB]);
			const steps = computed<WorkflowSetupStep[]>(() => [
				{
					kind: 'group',
					group: {
						subnodeRootNode: { name: 'Agent', type: 'agent', typeVersion: 1, id: 'agent-1' },
						subnodeSections: [sectionA, sectionB],
					},
				},
			]);
			const currentStepIndex = ref(0);
			const isReady = ref(true);
			const activeStep = computed<WorkflowSetupStep | undefined>(() => steps.value[0]);

			const completedSet = new Set<string>([sectionA.id]);
			const skippedSet = new Set<string>([sectionB.id]);

			const actions = useWorkflowSetupActions({
				requestId: ref('req-1'),
				sections,
				steps,
				activeStep,
				currentStepIndex,
				isReady,
				goToStep: vi.fn(),
				inputs: {
					credentialSelections: ref({}),
					isSectionComplete: (s) => completedSet.has(s.id),
					isSectionSkipped: (s) => skippedSet.has(s.id),
					markSectionSkipped: vi.fn(),
					buildCompletedSetupPayload: vi.fn(() => ({})),
				},
				applyMachine: { apply: vi.fn(), defer: vi.fn() },
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				thread: { currentThreadId: 't', findToolCallByRequestId: vi.fn() } as any,
			});

			expect(actions.isStepHandled(steps.value[0])).toBe(true);
		});
	});
});
