import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { effectScope, nextTick, ref } from 'vue';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { useWorkflowSetupTracking } from '../composables/useWorkflowSetupTracking';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { usePostHog } from '@/app/stores/posthog.store';
import { mockedStore } from '@/__tests__/utils';
import type { SetupPanelRow } from '../composables/useSetupPanelState';
import type { SetupPanelGroup } from '../setupPanelGroups';
import { useSetupPanelTelemetry } from '../composables/useSetupPanelTelemetry';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));

const item = {
	id: 'wf:credential:slackApi',
	kind: 'credential',
	credentialType: 'slackApi',
} as const;
const observed = TELEMETRY_EVENT.INSTANCE_AI.SETUP_PANEL_STATE_OBSERVED;
const shown = TELEMETRY_EVENT.INSTANCE_AI.SETUP_PANEL_ITEM_SHOWN;
const dismissed = TELEMETRY_EVENT.INSTANCE_AI.SETUP_PANEL_DISMISSED;

describe('useSetupPanelTelemetry', () => {
	beforeEach(() => setActivePinia(createTestingPinia()));
	const scopes: ReturnType<typeof effectScope>[] = [];
	beforeEach(() => track.mockClear());
	afterEach(() => {
		scopes.splice(0).forEach((scope) => scope.stop());
	});
	function setup(thread = { id: 'thread' }, getNodeByName?: () => undefined) {
		const workflowId = ref('wf');
		const rows = ref<SetupPanelRow[]>([{ item, isDone: true }]);
		const groups = ref<SetupPanelGroup[]>([]);
		const ready = ref(false);
		const shownItemIds = ref<string[]>([]);
		const scope = effectScope();
		scopes.push(scope);
		const telemetry = scope.run(() =>
			useSetupPanelTelemetry({
				workflowId,
				thread,
				rows,
				groups,
				ready,
				shownItemIds,
				getNodeByName,
			}),
		)!;
		return { workflowId, rows, groups, ready, shownItemIds, telemetry, scope };
	}

	it.each(['control', 'variant', undefined, false])(
		'includes the current assignment %s',
		async (variant) => {
			mockedStore(usePostHog).getVariant.mockReturnValue(variant);
			const state = setup();
			state.ready.value = true;
			await nextTick();
			const payload = track.mock.calls.find(([event]) => event === observed)?.[1];
			if (typeof variant === 'string') {
				expect(payload).toMatchObject({
					variant,
					'$feature/118_instance_ai_setup_overhaul': variant,
				});
			} else {
				expect(payload).not.toHaveProperty('variant');
				expect(payload).not.toHaveProperty('$feature/118_instance_ai_setup_overhaul');
			}
		},
	);

	it.each(['instance_ai_setup_panel', 'instance_ai_setup_wizard'] as const)(
		'keeps delayed validation on its original attempt in %s',
		async (source) => {
			const workflowId = ref('wf');
			const tracking = useWorkflowSetupTracking({ workflowId, threadId: 'thread', source });
			const validation = createDeferredPromise<boolean>();
			tracking.start('item', 'slackApi', 'existing', [{ id: 'node', type: 'slack' }]);
			const attempt = track.mock.calls.at(-1)?.[1];
			tracking.trackValidation('item', validation.promise);
			tracking.complete('item', 'credential', 'queued');
			workflowId.value = 'next-workflow';
			tracking.start('item', 'slackApi', 'existing', [{ id: 'other', type: 'slack' }]);
			validation.resolve(false);
			await validation.promise;

			expect(track).toHaveBeenLastCalledWith(
				TELEMETRY_EVENT.CREDENTIALS.USER_FAILED_CREDENTIAL_CONNECTION,
				{ ...attempt, error_type: 'validation' },
			);
			expect(tracking.hasAttempt('item')).toBe(true);
		},
	);

	it('records an unresolved visible row once', async () => {
		const state = setup({ id: 'thread' }, () => undefined);
		const row = {
			item: { id: 'parameters', kind: 'parameters', nodeName: 'Missing', parameterNames: ['url'] },
			isDone: false,
		} satisfies SetupPanelRow;
		state.rows.value = [row];
		state.groups.value = [{ id: 'details', parameters: [row] }];
		state.ready.value = true;
		await nextTick();
		expect(track).toHaveBeenCalledWith(
			shown,
			expect.objectContaining({
				kind: 'details',
				item_ids: [],
				parameter_count: 1,
			}),
		);
		state.groups.value = [...state.groups.value];
		await nextTick();
		expect(track.mock.calls.filter(([event]) => event === shown)).toHaveLength(1);
	});

	it('shares impressions across overlapping views without a false navigation dismissal', async () => {
		const thread = { id: 'thread' };
		const first = setup(thread);
		first.groups.value = [{ id: item.id, credential: { item, isDone: true }, parameters: [] }];
		first.ready.value = true;
		await nextTick();
		const second = setup(thread);
		second.groups.value = first.groups.value;
		second.ready.value = true;
		await nextTick();
		first.scope.stop();
		await nextTick();
		expect(track.mock.calls.filter(([event]) => event === shown)).toHaveLength(1);
		expect(track.mock.calls.filter(([event]) => event === observed)).toHaveLength(1);
		expect(track.mock.calls.filter(([event]) => event === dismissed)).toHaveLength(0);
		second.scope.stop();
		expect(track.mock.calls.filter(([event]) => event === dismissed)).toHaveLength(1);
	});

	it('updates connected counts when another tab changes shown item IDs', async () => {
		const state = setup();
		state.ready.value = true;
		await nextTick();
		state.shownItemIds.value = [item.id];
		await nextTick();
		expect(track).toHaveBeenLastCalledWith(
			observed,
			expect.objectContaining({ already_connected_count: 0 }),
		);
		expect(track.mock.calls.filter(([event]) => event === observed)).toHaveLength(2);
	});

	it('counts already-connected services without an impression and deduplicates equivalent state', async () => {
		const state = setup();
		expect(track).not.toHaveBeenCalled();
		state.ready.value = true;
		await nextTick();
		expect(track).toHaveBeenCalledExactlyOnceWith(observed, {
			workflow_id: 'wf',
			thread_id: 'thread',
			session_id: expect.any(String),
			credential_count: 1,
			pending_credential_count: 0,
			pending_parameter_count: 0,
			already_connected_count: 1,
		});
		state.rows.value = [{ item: { ...item }, isDone: true }];
		await nextTick();
		expect(track).toHaveBeenCalledTimes(1);
	});

	it('records each visible item once and distinguishes removal from navigation', async () => {
		const state = setup();
		state.ready.value = true;
		state.rows.value = [{ item, isDone: false }];
		state.shownItemIds.value = [item.id];
		state.groups.value = [{ id: item.id, credential: { item, isDone: false }, parameters: [] }];
		await nextTick();
		state.rows.value = [{ item, isDone: true }];
		state.groups.value = [{ id: item.id, credential: { item, isDone: true }, parameters: [] }];
		await nextTick();
		expect(track.mock.calls.filter(([name]) => name === shown)).toHaveLength(1);
		expect(track).toHaveBeenLastCalledWith(
			observed,
			expect.objectContaining({ already_connected_count: 0, pending_credential_count: 0 }),
		);
		state.groups.value = [];
		await nextTick();
		expect(track).toHaveBeenLastCalledWith(dismissed, {
			workflow_id: 'wf',
			thread_id: 'thread',
			session_id: expect.any(String),
			reason: 'items_removed',
		});
		state.scope.stop();
		expect(track.mock.calls.filter(([name]) => name === dismissed)).toHaveLength(1);
	});

	it('attributes a completed connection to its original workflow after navigation', async () => {
		const state = setup();
		state.ready.value = true;
		state.groups.value = [{ id: item.id, credential: { item, isDone: false }, parameters: [] }];
		await nextTick();
		state.telemetry.trackConnectionStarted(item, 'oauth');
		state.workflowId.value = 'other';
		state.groups.value = [];
		await nextTick();
		expect(track).toHaveBeenCalledWith(
			dismissed,
			expect.objectContaining({ workflow_id: 'wf', reason: 'navigation' }),
		);
		state.telemetry.trackConnectionCompleted(item, 'credential', 'applied');
		state.telemetry.trackConnectionCompleted(item, 'credential', 'applied');
		const completions = track.mock.calls.filter(
			([name]) => name === TELEMETRY_EVENT.CREDENTIALS.USER_COMPLETED_CREDENTIAL_CONNECTION,
		);
		expect(completions).toEqual([
			[
				TELEMETRY_EVENT.CREDENTIALS.USER_COMPLETED_CREDENTIAL_CONNECTION,
				{
					workflow_id: 'wf',
					thread_id: 'thread',
					attempt_id: expect.any(String),
					session_id: expect.any(String),
					source: 'instance_ai_setup_panel',
					credential_type: 'slackApi',
					credential_id: 'credential',
					method: 'oauth',
					binding_state: 'applied',
				},
			],
		]);
	});

	it('updates the observed count when a pending row gains another required parameter', async () => {
		const state = setup();
		state.ready.value = true;
		const parameters = {
			id: 'wf:parameters:Send',
			kind: 'parameters',
			nodeName: 'Send',
			parameterNames: ['channel'],
		} as const;
		state.rows.value = [{ item: { ...parameters, parameterNames: ['channel'] }, isDone: false }];
		await nextTick();
		state.rows.value = [
			{ item: { ...parameters, parameterNames: ['channel', 'message'] }, isDone: false },
		];
		await nextTick();
		expect(track).toHaveBeenLastCalledWith(
			observed,
			expect.objectContaining({ pending_parameter_count: 2 }),
		);
	});
});
