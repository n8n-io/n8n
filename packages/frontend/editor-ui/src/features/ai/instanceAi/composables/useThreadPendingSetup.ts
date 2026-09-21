import {
	computed,
	effectScope,
	onScopeDispose,
	shallowReactive,
	watch,
	type ComputedRef,
	type Ref,
} from 'vue';
import type { InstanceAiMessage, InstanceAiSetupItem } from '@n8n/api-types';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useSetupPanelState } from './useSetupPanelState';

/** Keep send-time state available when the checklist is collapsed or unmounted. */
export function useThreadPendingSetup(
	items: ComputedRef<Record<string, InstanceAiSetupItem[]>>,
	messages: Ref<InstanceAiMessage[]>,
) {
	const settings = useInstanceAiSettingsStore();
	const workflows = shallowReactive(
		new Map<
			string,
			{ scope: ReturnType<typeof effectScope>; state: ReturnType<typeof useSetupPanelState> }
		>(),
	);
	watch(
		() => (settings.isInstanceAiSetupPanelEnabled ? Object.keys(items.value) : []),
		(ids) => {
			for (const [id, entry] of workflows) {
				if (!ids.includes(id)) {
					entry.scope.stop();
					workflows.delete(id);
				}
			}
			for (const id of ids) {
				if (workflows.has(id)) continue;
				const scope = effectScope();
				const state = scope.run(() =>
					useSetupPanelState({
						workflowId: id,
						thread: {
							get messages() {
								return messages.value;
							},
							get setupItemsByWorkflowId() {
								return items.value;
							},
						},
					}),
				);
				if (state) workflows.set(id, { scope, state });
			}
		},
		{ immediate: true },
	);
	onScopeDispose(() => {
		for (const { scope } of workflows.values()) scope.stop();
	});
	return computed<boolean | undefined>(() => {
		if (!settings.isInstanceAiSetupPanelEnabled || workflows.size === 0) return undefined;
		let unknown = false;
		for (const { state } of workflows.values()) {
			const rows = state.rows.value;
			const nodesKnown = rows.every(({ item }) =>
				item.kind === 'credential'
					? Boolean(item.nodeBindings?.length) &&
						item.nodeBindings?.every(({ nodeName }) => state.getNodeByName(nodeName))
					: Boolean(state.getNodeByName(item.nodeName)),
			);
			if (
				!state.credentialsAvailable.value ||
				!nodesKnown ||
				(rows.length === 0 && state.rowSource.value !== 'derived')
			) {
				unknown = true;
				continue;
			}
			if (rows.some((row) => !row.isDone)) return true;
		}
		return unknown ? undefined : false;
	});
}
