import { computed, nextTick, ref, type ComputedRef, type Ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { mockedStore } from '@/__tests__/utils';
import { usePostHog } from '@/app/stores/posthog.store';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import type { ThreadRuntime } from '../../instanceAi.store';
import type { WorkflowSetupSection } from '../workflowSetup.types';
import { makeWorkflowSetupSection } from '../__tests__/factories';
import { useWorkflowSetupActions } from './useWorkflowSetupActions';

const telemetryTrack = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

const rootStoreState = { instanceId: 'instance-1', pushRef: 'session-1' };
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => rootStoreState,
}));

interface Harness {
	sectionA: WorkflowSetupSection;
	sectionB: WorkflowSetupSection;
	sections: ComputedRef<WorkflowSetupSection[]>;
	currentStepIndex: Ref<number>;
	isReady: Ref<boolean>;
	activeSection: ComputedRef<WorkflowSetupSection | undefined>;
	completedSet: Set<string>;
	skippedSet: Set<string>;
	credentialSelections: Ref<Record<string, Record<string, string>>>;
	skippedSectionIds: Ref<Set<string>>;
	goToStep: ReturnType<typeof vi.fn>;
	apply: ReturnType<typeof vi.fn>;
	defer: ReturnType<typeof vi.fn>;
	markSectionSkipped: ReturnType<typeof vi.fn>;
	buildCompletedSetupPayload: ReturnType<typeof vi.fn>;
	thread: { id: string; findToolCallByRequestId: ReturnType<typeof vi.fn> };
	actions: ReturnType<typeof useWorkflowSetupActions>;
}

function setupHarness(opts: { isReady?: boolean } = {}): Harness {
	const sectionA = makeWorkflowSetupSection({
		id: 'A:typeA',
		node: { id: 'node-a' },
		targetNodeName: 'A',
		credentialType: 'typeA',
	});
	const sectionB = makeWorkflowSetupSection({
		id: 'B:typeB',
		node: { id: 'node-b' },
		targetNodeName: 'B',
		credentialType: 'typeB',
	});
	const sections = computed(() => [sectionA, sectionB]);
	const currentStepIndex = ref(0);
	const isReady = ref(opts.isReady ?? true);
	const activeSection = computed<WorkflowSetupSection | undefined>(
		() => sections.value[currentStepIndex.value],
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
		id: 'thread-1',
		findToolCallByRequestId: vi.fn(() => ({
			confirmation: { inputThreadId: 'input-thread-1' },
		})),
	};

	const actions = useWorkflowSetupActions({
		requestId: ref('req-1'),
		workflowId: ref('workflow-1'),
		sections,
		activeSection,
		currentStepIndex,
		isReady,
		goToStep,
		inputs: {
			credentialSelections,
			isSectionComplete: (section) => completedSet.has(section.id),
			isSectionSkipped: (section) => skippedSet.has(section.id),
			isSectionHandled: (section) => completedSet.has(section.id) || skippedSet.has(section.id),
			markSectionSkipped,
			buildCompletedSetupPayload,
		},
		applyMachine: { apply, defer },
		thread: thread as unknown as ThreadRuntime,
	});

	return {
		sectionA,
		sectionB,
		sections,
		currentStepIndex,
		isReady,
		activeSection,
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
		setActivePinia(createTestingPinia());
		telemetryTrack.mockReset();
	});

	it.each(['control', 'variant', undefined, false])(
		'includes workflow and session context with the known assignment %s',
		async (variant) => {
			mockedStore(usePostHog).getVariant.mockReturnValue(variant);
			const h = setupHarness();
			h.completedSet.add(h.sectionA.id);
			await h.actions.apply();
			expect(telemetryTrack.mock.calls.map(([event]) => event)).toEqual([
				'Instance AI workflow setup step shown',
				'Instance AI workflow setup step handled',
				'User finished providing input',
			]);
			for (const [, payload] of telemetryTrack.mock.calls) {
				expect(payload).toMatchObject({
					workflow_id: 'workflow-1',
					thread_id: 'thread-1',
					session_id: 'session-1',
				});
				if (typeof variant === 'string') {
					expect(payload).toMatchObject({
						variant,
						'$feature/118_instance_ai_setup_overhaul': variant,
					});
				} else {
					expect(payload).not.toHaveProperty('variant');
					expect(payload).not.toHaveProperty('$feature/118_instance_ai_setup_overhaul');
				}
			}
		},
	);

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
				setup_inputs: [
					expect.objectContaining({
						node_ids: ['node-a'],
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

	it('does not track a step as shown until bootstrap is ready', async () => {
		const h = setupHarness({ isReady: false });
		expect(getTelemetryCalls('Instance AI workflow setup step shown')).toHaveLength(0);

		h.isReady.value = true;
		await nextTick();
		expect(getTelemetryCalls('Instance AI workflow setup step shown')).toHaveLength(1);
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
		h.apply.mockResolvedValueOnce({
			success: true,
			partial: true,
			completedNodes: [{ nodeName: 'A', credentialType: 'typeA' }],
			nodesStillNeedingSetup: [{ nodeName: 'B', credentialType: 'typeB' }],
		});

		await h.actions.apply();

		expect(h.apply).toHaveBeenCalledWith({ nodeCredentials: { A: { typeA: 'cred-id' } } });
		expect(getTelemetryCalls('User finished providing input')).toHaveLength(1);
		expect(telemetryTrack).toHaveBeenCalledWith(
			'Instance AI workflow setup step handled',
			expect.objectContaining({
				outcome: 'completed',
			}),
		);
		expect(telemetryTrack).toHaveBeenCalledWith(
			TELEMETRY_EVENT.WORKFLOW.SETUP_SAVED,
			expect.objectContaining({
				workflow_id: 'workflow-1',
				request_id: 'req-1',
				setup_complete: false,
				items: [
					expect.objectContaining({ node_id: 'node-a', credential_type: 'typeA', completed: true }),
					expect.objectContaining({
						node_id: 'node-b',
						credential_type: 'typeB',
						completed: false,
					}),
				],
			}),
		);
	});

	it('tracks both credential and parameter inputs for a completed mixed section', async () => {
		const h = setupHarness();
		h.sectionA.parameterNames = ['url', 'method'];
		h.completedSet.add(h.sectionA.id);
		h.completedSet.add(h.sectionB.id);
		h.credentialSelections.value = { A: { typeA: 'cred-id' }, B: { typeB: 'cred-b' } };
		h.buildCompletedSetupPayload.mockReturnValueOnce({
			nodeCredentials: { A: { typeA: 'cred-id' }, B: { typeB: 'cred-b' } },
			nodeParameters: { A: { url: 'https://example.test', method: 'GET' } },
		});
		h.apply.mockResolvedValueOnce({
			success: true,
			completedNodes: [
				{ nodeName: 'A', credentialType: 'typeA', parametersSet: ['url', 'method'] },
				{ nodeName: 'B', credentialType: 'typeB' },
			],
		});

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
					{
						label: 'n8n-nodes-base.httpRequest - typeB',
						options: [],
						option_chosen: 'true',
					},
				],
				num_tasks: 2,
			}),
		);
		expect(telemetryTrack).toHaveBeenCalledWith(
			TELEMETRY_EVENT.WORKFLOW.SETUP_SAVED,
			expect.objectContaining({
				setup_complete: true,
				items: [
					expect.objectContaining({ node_id: 'node-a', kind: 'credential', completed: true }),
					expect.objectContaining({ node_id: 'node-a', parameter_name: 'url', completed: true }),
					expect.objectContaining({ node_id: 'node-a', parameter_name: 'method', completed: true }),
					expect.objectContaining({ node_id: 'node-b', kind: 'credential', completed: true }),
				],
			}),
		);
	});
});
