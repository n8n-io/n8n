import { onScopeDispose, ref, shallowReactive, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { TELEMETRY_EVENT, type InferTelemetryProps } from '@n8n/telemetry';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useInstanceAiSetupPanelExperiment } from '@/experiments/instanceAiSetupPanel/useInstanceAiSetupPanelExperiment';
import type { SetupPanelGroup } from '../setupPanelGroups';
import type { SetupPanelRow } from './useSetupPanelState';
import type { SetupCredentialItem, SetupPanelApplyResult } from './useSetupPanelActions';

export type SetupPanelConnectionMethod = InferTelemetryProps<
	typeof TELEMETRY_EVENT.CREDENTIALS.USER_STARTED_CREDENTIAL_CONNECTION
>['method'];
type DismissReason = InferTelemetryProps<
	typeof TELEMETRY_EVENT.INSTANCE_AI.SETUP_PANEL_DISMISSED
>['reason'];

function createTelemetryState() {
	return {
		owners: shallowReactive(new Set<symbol>()),
		shownRows: new Set<string>(),
		snapshots: new Map<string, string>(),
		connectionAttempts: new Map<
			string,
			{ method: SetupPanelConnectionMethod; workflowId: string }
		>(),
		visibleWorkflowId: ref<string>(),
	};
}

// A thread can briefly have two mounted views during a layout change.
const states = new WeakMap<object, ReturnType<typeof createTelemetryState>>();

export function useSetupPanelTelemetry(options: {
	workflowId: MaybeRefOrGetter<string>;
	thread: { id: string };
	rows: MaybeRefOrGetter<SetupPanelRow[]>;
	groups: MaybeRefOrGetter<SetupPanelGroup[]>;
	shownItemIds: MaybeRefOrGetter<string[]>;
	ready: MaybeRefOrGetter<boolean>;
}) {
	const telemetry = useTelemetry();
	const rootStore = useRootStore();
	const { getTelemetryPayload } = useInstanceAiSetupPanelExperiment();
	const state = states.get(options.thread) ?? createTelemetryState();
	states.set(options.thread, state);
	const owner = Symbol();
	state.owners.add(owner);
	const isOwner = () => [...state.owners].at(-1) === owner;
	const { shownRows, snapshots, connectionAttempts } = state;
	const context = () => ({
		...getTelemetryPayload(),
		session_id: rootStore.pushRef,
		workflow_id: toValue(options.workflowId),
		thread_id: options.thread.id,
	});

	function trackDismissed(reason: DismissReason) {
		if (!state.visibleWorkflowId.value) return;
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.SETUP_PANEL_DISMISSED, {
			...context(),
			workflow_id: state.visibleWorkflowId.value,
			reason,
		});
		state.visibleWorkflowId.value = undefined;
	}

	watch(
		() =>
			[
				toValue(options.workflowId),
				toValue(options.rows),
				toValue(options.groups),
				toValue(options.ready),
				[...toValue(options.shownItemIds)],
				isOwner(),
			] as const,
		([workflowId, rows, groups, ready, shownItemIds, ownsTracking]) => {
			if (!ownsTracking) return;
			if (state.visibleWorkflowId.value && state.visibleWorkflowId.value !== workflowId)
				trackDismissed('navigation');
			if (!ready) return;
			const key = JSON.stringify(
				rows
					.map((row) => ({
						id: row.item.id,
						done: row.isDone,
						shown: shownItemIds.includes(row.item.id),
						parameters:
							row.item.kind === 'parameters' ? [...row.item.parameterNames].sort() : undefined,
					}))
					.sort((a, b) => a.id.localeCompare(b.id)),
			);
			if (snapshots.get(workflowId) !== key) {
				snapshots.set(workflowId, key);
				const credentials = rows.filter((row) => row.item.kind === 'credential');
				telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.SETUP_PANEL_STATE_OBSERVED, {
					...context(),
					credential_count: credentials.length,
					pending_credential_count: credentials.filter((row) => !row.isDone).length,
					pending_parameter_count: rows.reduce(
						(count, row) =>
							count +
							(row.item.kind === 'parameters' && !row.isDone ? row.item.parameterNames.length : 0),
						0,
					),
					already_connected_count: credentials.filter(
						(row) => row.isDone && !shownItemIds.includes(row.item.id),
					).length,
				});
			}
			if (groups.length) state.visibleWorkflowId.value = workflowId;
			else trackDismissed('items_removed');
			for (const group of groups) {
				const rowKey = `${workflowId}:${group.id}`;
				if (shownRows.has(rowKey)) continue;
				shownRows.add(rowKey);
				telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.SETUP_PANEL_ITEM_SHOWN, {
					...context(),
					kind: group.credential ? 'credential' : group.node ? 'parameters' : 'details',
					credential_type: group.credential?.item.credentialType,
					parameter_count: group.parameters.reduce(
						(count, row) => count + row.item.parameterNames.length,
						0,
					),
				});
			}
		},
		{ immediate: true },
	);

	function trackConnectionStarted(item: SetupCredentialItem, method: SetupPanelConnectionMethod) {
		if (!isOwner()) return;
		connectionAttempts.set(item.id, { method, workflowId: toValue(options.workflowId) });
		telemetry.track(TELEMETRY_EVENT.CREDENTIALS.USER_STARTED_CREDENTIAL_CONNECTION, {
			...context(),
			source: 'instance_ai_setup_panel',
			credential_type: item.credentialType,
			method,
		});
	}

	function trackConnectionCompleted(
		item: SetupCredentialItem,
		credentialId: string | null,
		result: SetupPanelApplyResult,
	) {
		const attempt = connectionAttempts.get(item.id);
		if (!attempt || (result !== 'applied' && result !== 'noop' && result !== 'queued')) return;
		connectionAttempts.delete(item.id);
		telemetry.track(TELEMETRY_EVENT.CREDENTIALS.USER_COMPLETED_CREDENTIAL_CONNECTION, {
			...context(),
			workflow_id: attempt.workflowId,
			source: 'instance_ai_setup_panel',
			credential_type: item.credentialType,
			credential_id: credentialId,
			method: attempt.method,
			binding_state: result,
		});
	}

	onScopeDispose(() => {
		state.owners.delete(owner);
		if (state.owners.size === 0) {
			trackDismissed('navigation');
			states.delete(options.thread);
		}
	});
	return { trackConnectionStarted, trackConnectionCompleted, trackDismissed };
}
