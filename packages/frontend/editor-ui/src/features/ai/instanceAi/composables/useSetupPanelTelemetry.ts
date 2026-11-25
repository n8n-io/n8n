import { onScopeDispose, ref, shallowReactive, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { TELEMETRY_EVENT, type InferTelemetryProps } from '@n8n/telemetry';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useInstanceAiSetupPanelExperiment } from '@/experiments/instanceAiSetupPanel/useInstanceAiSetupPanelExperiment';
import type { InstanceAiSetupItem } from '@n8n/api-types';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { SetupPanelGroup } from '../setupPanelGroups';
import type { SetupPanelRow, SetupPanelThreadSource } from './useSetupPanelState';
import {
	resolveSetupCredentialItem,
	type SetupCredentialItem,
	type SetupPanelApplyResult,
} from './useSetupPanelActions';

export type SetupPanelConnectionMethod = InferTelemetryProps<
	typeof TELEMETRY_EVENT.CREDENTIALS.USER_STARTED_CREDENTIAL_CONNECTION
>['method'];
type DismissReason = InferTelemetryProps<
	typeof TELEMETRY_EVENT.INSTANCE_AI.SETUP_PANEL_DISMISSED
>['reason'];
type SavedSetupItem = InferTelemetryProps<
	typeof TELEMETRY_EVENT.WORKFLOW.SETUP_SAVED
>['items'][number];

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
	thread: { id: string } & Pick<SetupPanelThreadSource, 'setupItemsByWorkflowId'>;
	rows: MaybeRefOrGetter<SetupPanelRow[]>;
	groups: MaybeRefOrGetter<SetupPanelGroup[]>;
	shownItemIds: MaybeRefOrGetter<string[]>;
	ready: MaybeRefOrGetter<boolean>;
	getNodeByName: (name: string) => INodeUi | undefined;
	isItemDone: (
		item: InstanceAiSetupItem,
		readNode: (name: string) => INodeUi | undefined,
	) => boolean;
	isAgentBuilding: MaybeRefOrGetter<boolean>;
}) {
	const telemetry = useTelemetry();
	const rootStore = useRootStore();
	const nodeTypesStore = useNodeTypesStore();
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

	function getItems(
		setupItems: InstanceAiSetupItem[],
		readNode = options.getNodeByName,
	): SavedSetupItem[] {
		return setupItems.flatMap<SavedSetupItem>((item) => {
			if (item.kind === 'credential') {
				return (item.nodeBindings ?? []).flatMap((binding) => {
					const node = readNode(binding.nodeName);
					return node
						? [
								{
									node_id: node.id,
									node_type: node.type,
									kind: 'credential' as const,
									credential_type: item.credentialType,
									completed: options.isItemDone({ ...item, nodeBindings: [binding] }, readNode),
								},
							]
						: [];
				});
			}
			const node = readNode(item.nodeName);
			return node
				? item.parameterNames.map((name) => ({
						node_id: node.id,
						node_type: node.type,
						kind: 'parameter' as const,
						parameter_name: name,
						completed: options.isItemDone({ ...item, parameterNames: [name] }, readNode),
					}))
				: [];
		});
	}

	function trackSaved(workflow: IWorkflowDb) {
		if (!state.owners.has(owner) || workflow.id !== toValue(options.workflowId)) return;
		const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));
		// The preview can still contain the pre-build graph when the save completes.
		const announced = Object.hasOwn(options.thread.setupItemsByWorkflowId, workflow.id)
			? options.thread.setupItemsByWorkflowId[workflow.id]
			: [];
		const requirements = new Map([
			...announced.map((item) => [item.id, item] as const),
			...toValue(options.rows).map(({ item }) => [item.id, item] as const),
		]);
		const savedRequirements = [...requirements.values()].map((item) =>
			item.kind === 'credential'
				? resolveSetupCredentialItem(item, workflow.nodes, nodeTypesStore)
				: item,
		);
		const readNode = (name: string) => nodes.get(name);
		const items = getItems(savedRequirements, readNode);
		if (items.length === 0) return;
		telemetry.track(TELEMETRY_EVENT.WORKFLOW.SETUP_SAVED, {
			...context(),
			instance_id: rootStore.instanceId,
			source: 'instance_ai_setup_panel',
			items,
			setup_complete: !toValue(options.isAgentBuilding) && items.every((item) => item.completed),
		});
	}

	function getChatTelemetryContext() {
		const groups = toValue(options.groups);
		if (!isOwner() || !toValue(options.ready) || groups.length === 0) return undefined;
		return {
			...context(),
			pending_credential_count: groups.filter(
				(group) => group.credential && !group.credential.isDone,
			).length,
			pending_parameter_count: groups.reduce(
				(count, group) =>
					count +
					group.parameters.reduce(
						(total, row) => total + (row.isDone ? 0 : row.item.parameterNames.length),
						0,
					),
				0,
			),
		};
	}

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
					items: getItems([
						...(group.credential ? [group.credential.item] : []),
						...group.parameters.map(({ item }) => item),
					]).map(({ completed, ...item }) => item),
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
	return {
		trackConnectionStarted,
		trackConnectionCompleted,
		trackDismissed,
		trackSaved,
		getChatTelemetryContext,
	};
}
