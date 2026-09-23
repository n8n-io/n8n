import { effectScope, nextTick, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { InstanceAiSetupItem } from '@n8n/api-types';
import type { INodeUi } from '@/Interface';
import { createTestNode, createTestWorkflow, mockNodeTypeDescription } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { usePostHog } from '@/app/stores/posthog.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
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
const saved = TELEMETRY_EVENT.WORKFLOW.SETUP_SAVED;
const node = createTestNode({ id: 'node-1', name: 'Slack', type: 'test.slack' });
const credential = { id: 'credential', name: 'Account' };
const configuredNode = {
	...node,
	credentials: { slackApi: credential },
	parameters: { channel: 'ready' },
};
const boundItem = { ...item, nodeBindings: [{ nodeName: node.name }] };
const parameterItem = {
	id: 'wf:parameters:Slack',
	kind: 'parameters',
	nodeName: node.name,
	parameterNames: ['channel'],
} satisfies InstanceAiSetupItem;
const credentialRequirement = {
	node_id: node.id,
	node_type: node.type,
	kind: 'credential',
	credential_type: 'slackApi',
};
const parameterRequirement = {
	node_id: node.id,
	node_type: node.type,
	kind: 'parameter',
	parameter_name: 'channel',
};

describe('useSetupPanelTelemetry', () => {
	const scopes: ReturnType<typeof effectScope>[] = [];
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		track.mockClear();
		mockedStore(useNodeTypesStore).getNodeType = vi.fn().mockReturnValue(
			mockNodeTypeDescription({
				name: node.type,
				credentials: [{ name: 'slackApi', required: true }],
				properties: [
					{ name: 'channel', displayName: 'Channel', type: 'string', required: true, default: '' },
				],
			}),
		);
	});
	afterEach(() => {
		scopes.splice(0).forEach((scope) => scope.stop());
	});
	function setup(
		thread: { id: string; setupItemsByWorkflowId: Record<string, InstanceAiSetupItem[]> } = {
			id: 'thread',
			setupItemsByWorkflowId: {},
		},
	) {
		const workflowId = ref('wf');
		const rows = ref<SetupPanelRow[]>([{ item, isDone: true }]);
		const groups = ref<SetupPanelGroup[]>([]);
		const ready = ref(false);
		const shownItemIds = ref<string[]>([]);
		const nodes = ref<INodeUi[]>([]);
		const isAgentBuilding = ref(false);
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
				getNodeByName: (name) => nodes.value.find((candidate) => candidate.name === name),
				isItemDone: (requirement, readNode) => {
					if (requirement.kind === 'credential')
						return (requirement.nodeBindings ?? []).every(({ nodeName }) =>
							Boolean(readNode(nodeName)?.credentials?.[requirement.credentialType]?.id),
						);
					return requirement.parameterNames.every((name) =>
						Boolean(readNode(requirement.nodeName)?.parameters[name]),
					);
				},
				isAgentBuilding,
			}),
		)!;
		return {
			workflowId,
			rows,
			groups,
			ready,
			shownItemIds,
			nodes,
			isAgentBuilding,
			telemetry,
			scope,
		};
	}

	it.each(['control', 'variant', undefined, false])(
		'includes session context and the known assignment %s on existing events',
		async (variant) => {
			mockedStore(usePostHog).getVariant.mockReturnValue(variant);
			const state = setup();
			state.groups.value = [{ id: item.id, credential: { item, isDone: true }, parameters: [] }];
			state.ready.value = true;
			await nextTick();
			state.telemetry.trackConnectionStarted(item, 'oauth');
			state.telemetry.trackConnectionCompleted(item, 'credential', 'queued');
			state.telemetry.trackDismissed('user_dismissed');
			expect(track.mock.calls.map(([event]) => event)).toEqual([
				observed,
				shown,
				TELEMETRY_EVENT.CREDENTIALS.USER_STARTED_CREDENTIAL_CONNECTION,
				TELEMETRY_EVENT.CREDENTIALS.USER_COMPLETED_CREDENTIAL_CONNECTION,
				dismissed,
			]);
			for (const [, payload] of track.mock.calls) {
				expect(payload).toMatchObject({
					workflow_id: 'wf',
					thread_id: 'thread',
					session_id: useRootStore().pushRef,
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

	it('shares impressions across overlapping views without a false navigation dismissal', async () => {
		const thread = { id: 'thread', setupItemsByWorkflowId: {} };
		const first = setup(thread);
		first.groups.value = [{ id: item.id, credential: { item, isDone: true }, parameters: [] }];
		first.ready.value = true;
		await nextTick();
		const second = setup(thread);
		second.groups.value = first.groups.value;
		second.ready.value = true;
		await nextTick();
		expect(first.telemetry.getChatTelemetryContext()).toBeUndefined();
		expect(second.telemetry.getChatTelemetryContext()).toMatchObject({
			pending_credential_count: 0,
			pending_parameter_count: 0,
		});
		first.scope.stop();
		await nextTick();
		expect(track.mock.calls.filter(([event]) => event === shown)).toHaveLength(1);
		expect(track.mock.calls.filter(([event]) => event === observed)).toHaveLength(1);
		expect(track.mock.calls.filter(([event]) => event === dismissed)).toHaveLength(0);
		second.scope.stop();
		expect(track.mock.calls.filter(([event]) => event === dismissed)).toHaveLength(1);
	});

	it.each([true, false])('reads saved nodes instead of draft completion: %s', (complete) => {
		const state = setup();
		state.rows.value = [
			{ item: boundItem, isDone: !complete },
			{ item: parameterItem, isDone: !complete },
		];
		state.nodes.value = [complete ? node : configuredNode];
		const workflow = createTestWorkflow({
			id: 'wf',
			nodes: [complete ? configuredNode : node],
		});
		state.telemetry.trackSaved(workflow);
		expect(track).toHaveBeenCalledExactlyOnceWith(
			saved,
			expect.objectContaining({
				workflow_id: 'wf',
				thread_id: 'thread',
				session_id: useRootStore().pushRef,
				source: 'instance_ai_setup_panel',
				setup_complete: complete,
				items: [
					{ ...credentialRequirement, completed: complete },
					{ ...parameterRequirement, completed: complete },
				],
			}),
		);
		track.mockClear();
		state.telemetry.trackSaved({ ...workflow, id: 'another-workflow' });
		expect(track).not.toHaveBeenCalled();
		if (complete) {
			state.isAgentBuilding.value = true;
			state.telemetry.trackSaved(workflow);
			expect(track).toHaveBeenLastCalledWith(
				saved,
				expect.objectContaining({ setup_complete: false }),
			);
		}
		track.mockClear();
		state.scope.stop();
		state.telemetry.trackSaved(workflow);
		expect(track).not.toHaveBeenCalled();
	});

	it.each(['empty', 'stale'] as const)(
		'includes announced requirements when current rows are %s after a build',
		(currentRows) => {
			const state = setup({
				id: 'thread',
				setupItemsByWorkflowId: { wf: [item, parameterItem] },
			});
			state.rows.value = currentRows === 'empty' ? [] : [{ item, isDone: true }];
			state.telemetry.trackSaved(
				createTestWorkflow({
					id: 'wf',
					nodes: [{ ...configuredNode, parameters: { channel: '' } }],
				}),
			);
			expect(track).toHaveBeenCalledExactlyOnceWith(
				saved,
				expect.objectContaining({
					setup_complete: false,
					items: [
						{ ...credentialRequirement, completed: true },
						{ ...parameterRequirement, completed: false },
					],
				}),
			);
		},
	);

	it('includes only visible pending requirements in ready chat context', () => {
		mockedStore(usePostHog).getVariant.mockReturnValue('variant');
		const state = setup();
		state.rows.value = [
			{ item: { ...parameterItem, id: 'hidden', parameterNames: ['hidden'] }, isDone: false },
		];
		state.groups.value = [
			{
				id: item.id,
				credential: { item, isDone: false },
				parameters: [
					{ item: { ...parameterItem, parameterNames: ['channel', 'text'] }, isDone: false },
				],
			},
			{
				id: 'done',
				credential: { item, isDone: true },
				parameters: [{ item: parameterItem, isDone: true }],
			},
		];
		expect(state.telemetry.getChatTelemetryContext()).toBeUndefined();
		state.ready.value = true;
		expect(state.telemetry.getChatTelemetryContext()).toEqual({
			workflow_id: 'wf',
			thread_id: 'thread',
			session_id: useRootStore().pushRef,
			variant: 'variant',
			'$feature/118_instance_ai_setup_overhaul': 'variant',
			pending_credential_count: 1,
			pending_parameter_count: 2,
		});
		state.groups.value = [];
		expect(state.telemetry.getChatTelemetryContext()).toBeUndefined();
	});

	it.each(['credential', 'parameters', 'details'] as const)(
		'includes requirement identities and counts in a %s exposure',
		async (kind) => {
			const state = setup();
			state.nodes.value = [node];
			const parameters = [
				{ item: { ...parameterItem, parameterNames: ['channel', 'text'] }, isDone: false },
			];
			state.groups.value = [
				{
					id: 'group',
					...(kind === 'credential' ? { credential: { item: boundItem, isDone: false } } : {}),
					...(kind === 'parameters' ? { node } : {}),
					parameters,
				},
			];
			state.ready.value = true;
			await nextTick();
			expect(track).toHaveBeenCalledWith(
				shown,
				expect.objectContaining({
					kind,
					credential_type: kind === 'credential' ? 'slackApi' : undefined,
					parameter_count: 2,
					items: [
						...(kind === 'credential' ? [credentialRequirement] : []),
						parameterRequirement,
						{ ...parameterRequirement, parameter_name: 'text' },
					],
				}),
			);
		},
	);

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
			session_id: expect.any(String),
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
			session_id: expect.any(String),
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
					session_id: expect.any(String),
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
