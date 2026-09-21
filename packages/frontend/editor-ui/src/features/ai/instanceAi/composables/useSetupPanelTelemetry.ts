import { onScopeDispose, ref, shallowReactive, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { TELEMETRY_EVENT, type InferTelemetryProps } from '@n8n/telemetry';
import { instanceAiSetupRequirementId } from '@n8n/api-types';
import type { INodeUi } from '@/Interface';
import {
	useWorkflowSetupTracking,
	type SetupConnectionError,
	type SetupConnectionPayload,
	type SetupConnectionCancellation,
} from './useWorkflowSetupTracking';
import { useTelemetry } from '@n8n/composables/useTelemetry';
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
		connectionAttempts: new Map<string, SetupConnectionPayload[]>(),
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
	getNodeByName?: (name: string) => INodeUi | undefined;
}) {
	const telemetry = useTelemetry();
	const state = states.get(options.thread) ?? createTelemetryState();
	states.set(options.thread, state);
	const owner = Symbol();
	state.owners.add(owner);
	const isOwner = () => [...state.owners].at(-1) === owner;
	const { shownRows, snapshots } = state;
	const tracking = useWorkflowSetupTracking({
		workflowId: options.workflowId,
		threadId: options.thread.id,
		source: 'instance_ai_setup_panel',
		attempts: state.connectionAttempts,
	});
	const context = tracking.context;
	const nodesFor = (item: SetupCredentialItem) =>
		(item.nodeBindings ?? []).flatMap(({ nodeName }) => {
			const node = options.getNodeByName?.(nodeName);
			return node ? [node] : [];
		});

	function trackDismissed(reason: DismissReason) {
		if (!state.visibleWorkflowId.value) return;
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.SETUP_PANEL_DISMISSED, {
			...context(),
			workflow_id: state.visibleWorkflowId.value,
			thread_id: options.thread.id,
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
				const credential = group.credential?.item;
				const itemIds = [
					...(credential
						? nodesFor(credential).map((node) =>
								instanceAiSetupRequirementId(
									workflowId,
									node.id,
									'credential',
									credential.credentialType,
								),
							)
						: []),
					...group.parameters.flatMap(({ item }) => {
						const node = options.getNodeByName?.(item.nodeName);
						return node
							? item.parameterNames.map((name) =>
									instanceAiSetupRequirementId(workflowId, node.id, 'parameter', name),
								)
							: [];
					}),
				];
				if (options.getNodeByName && itemIds.length === 0) continue;
				shownRows.add(rowKey);
				telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.SETUP_PANEL_ITEM_SHOWN, {
					...context(),
					item_ids: itemIds,
					node_types: [
						...new Set([
							...(group.credential ? nodesFor(group.credential.item).map((node) => node.type) : []),
							...group.parameters.flatMap(({ item }) => {
								const node = options.getNodeByName?.(item.nodeName);
								return node ? [node.type] : [];
							}),
						]),
					],
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
		if (isOwner()) tracking.start(item.id, item.credentialType, method, nodesFor(item));
	}

	function trackConnectionCompleted(
		item: SetupCredentialItem,
		credentialId: string | null,
		result: SetupPanelApplyResult,
	) {
		if (result === 'applied' || result === 'noop' || result === 'queued')
			tracking.complete(item.id, credentialId, result, nodesFor(item));
		else if (result === 'error' || result === 'conflict')
			tracking.fail(item.id, result === 'conflict' ? 'conflict' : 'save');
	}

	onScopeDispose(() => {
		state.owners.delete(owner);
		if (state.owners.size === 0) {
			trackDismissed('navigation');
			states.delete(options.thread);
		}
	});
	return {
		trackConnectionStarted,
		trackConnectionCompleted,
		trackDismissed,
		trackConnectionFailed: (item: SetupCredentialItem, error: SetupConnectionError) =>
			tracking.fail(item.id, error),
		trackConnectionCancelled: (item: SetupCredentialItem, reason: SetupConnectionCancellation) =>
			tracking.cancel(item.id, reason),
		trackParameterStarted: tracking.parameterStarted,
	};
}
