import { ref, watch, onUnmounted, type Ref } from 'vue';
import type { InstanceAiToolCallState } from '@n8n/api-types';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useToast } from '@/app/composables/useToast';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import type { INodeUi } from '@/Interface';
import type { useInstanceAiStore } from '../../instanceAi.store';
import type { TerminalState } from '../workflowSetup.types';

type ServerNode = {
	id?: string;
	name?: string;
	type?: string;
	typeVersion?: number;
	position?: [number, number];
	parameters?: Record<string, unknown>;
	credentials?: Record<string, { id?: string; name: string }>;
};

const APPLY_TIMEOUT_MS = 60_000;

export function useWorkflowSetupApply(deps: {
	requestId: Ref<string>;
	workflowId: Ref<string>;
	store: ReturnType<typeof useInstanceAiStore>;
}): {
	terminalState: Ref<TerminalState | null>;
	apply: (nodeCredentials: Record<string, Record<string, string>>) => Promise<void>;
	defer: () => Promise<void>;
} {
	const workflowsStore = useWorkflowsStore();
	const nodeHelpers = useNodeHelpers();
	const toast = useToast();

	const terminalState = ref<TerminalState | null>(null);

	let cancelWait: (() => void) | null = null;

	onUnmounted(() => {
		cancelWait?.();
	});

	function isToolResult(val: unknown): val is Record<string, unknown> {
		return typeof val === 'object' && val !== null && !Array.isArray(val);
	}

	function waitForToolResult(requestId: string): {
		promise: Promise<Record<string, unknown> | null>;
		cancel: () => void;
	} {
		let stopWatch: (() => void) | null = null;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		function cleanup() {
			if (stopWatch) {
				stopWatch();
				stopWatch = null;
			}
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
		}

		const promise = new Promise<Record<string, unknown> | null>((resolve) => {
			const existing = deps.store.findToolCallByRequestId(requestId);
			if (existing?.result !== undefined) {
				resolve(isToolResult(existing.result) ? existing.result : null);
				return;
			}

			stopWatch = watch(
				() => {
					const tc: InstanceAiToolCallState | undefined =
						deps.store.findToolCallByRequestId(requestId);
					return tc?.result;
				},
				(result) => {
					if (result !== undefined) {
						cleanup();
						resolve(isToolResult(result) ? result : null);
					}
				},
			);

			timeoutId = setTimeout(() => {
				cleanup();
				resolve(null);
			}, APPLY_TIMEOUT_MS);
		});

		return { promise, cancel: cleanup };
	}

	function applyServerResultToCanvas(result: Record<string, unknown>) {
		// Guard: only mutate the canvas when the user is actually viewing the
		// target workflow. If not, the server already persisted the update;
		// the user sees it on next open. Writing here would misroute the update
		// (updateNodeProperties finds nodes by name against whatever workflow is
		// hydrated) and refresh credential issues on the wrong workflow
		// (useNodeHelpers scopes off workflowsStore.workflowId).
		if (workflowsStore.workflowId !== deps.workflowId.value) return;

		const updatedNodes = result.updatedNodes;
		if (!Array.isArray(updatedNodes)) return;

		const workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(deps.workflowId.value),
		);

		for (const raw of updatedNodes as ServerNode[]) {
			const name = raw.name;
			if (!name) continue;

			const properties: Partial<Pick<INodeUi, 'credentials' | 'parameters'>> = {};
			if (raw.credentials !== undefined) {
				properties.credentials = raw.credentials as INodeUi['credentials'];
			}
			if (raw.parameters !== undefined) {
				properties.parameters = raw.parameters as INodeUi['parameters'];
			}
			if (Object.keys(properties).length === 0) continue;

			workflowDocumentStore.updateNodeProperties({
				name,
				properties,
			});
			nodeHelpers.updateNodeCredentialIssuesByName(name);
		}
	}

	async function apply(nodeCredentials: Record<string, Record<string, string>>): Promise<void> {
		if (terminalState.value === 'applying') return;
		terminalState.value = 'applying';

		const postSuccess = await deps.store.confirmAction(
			deps.requestId.value,
			true,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			{
				action: 'apply',
				nodeCredentials,
			},
		);

		// confirmAction already toasts on POST failure; just reset so the wizard
		// re-renders with the user's selections and they can try again.
		if (!postSuccess) {
			terminalState.value = null;
			return;
		}

		cancelWait?.();
		const { promise, cancel } = waitForToolResult(deps.requestId.value);
		cancelWait = cancel;
		const result = await promise;
		cancelWait = null;

		if (result === null) {
			toast.showError(new Error('Apply timed out — please try again.'), 'Setup failed');
			terminalState.value = null;
			return;
		}

		if (result.success === true) {
			applyServerResultToCanvas(result);
			terminalState.value = result.partial === true ? 'partial' : 'applied';
			deps.store.resolveConfirmation(deps.requestId.value, 'approved');
			return;
		}

		const message = typeof result.error === 'string' ? result.error : 'Apply failed.';
		toast.showError(new Error(message), 'Setup failed');
		terminalState.value = null;
	}

	async function defer(): Promise<void> {
		if (terminalState.value === 'applying') return;
		terminalState.value = 'applying';

		const success = await deps.store.confirmAction(deps.requestId.value, false);
		if (success) {
			terminalState.value = 'deferred';
			deps.store.resolveConfirmation(deps.requestId.value, 'deferred');
			return;
		}
		// confirmAction already toasted. Reset so the wizard re-renders.
		terminalState.value = null;
	}

	return {
		terminalState,
		apply,
		defer,
	};
}
