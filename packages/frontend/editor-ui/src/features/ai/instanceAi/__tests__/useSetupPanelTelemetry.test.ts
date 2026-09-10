import { effectScope, nextTick, ref } from 'vue';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
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
	const scopes: ReturnType<typeof effectScope>[] = [];
	beforeEach(() => track.mockClear());
	afterEach(() => {
		scopes.splice(0).forEach((scope) => scope.stop());
	});
	function setup() {
		const workflowId = ref('wf');
		const rows = ref<SetupPanelRow[]>([{ item, isDone: true }]);
		const groups = ref<SetupPanelGroup[]>([]);
		const ready = ref(false);
		const shownItemIds = ref<string[]>([]);
		const scope = effectScope();
		scopes.push(scope);
		const telemetry = scope.run(() =>
			useSetupPanelTelemetry({ workflowId, threadId: 'thread', rows, groups, ready, shownItemIds }),
		)!;
		return { workflowId, rows, groups, ready, shownItemIds, telemetry, scope };
	}

	it('counts already-connected services without an impression and deduplicates equivalent state', async () => {
		const state = setup();
		expect(track).not.toHaveBeenCalled();
		state.ready.value = true;
		await nextTick();
		expect(track).toHaveBeenCalledExactlyOnceWith(observed, {
			workflow_id: 'wf',
			thread_id: 'thread',
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
		state.telemetry.trackConnectionCompleted(item, 'credential', 'error');
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
