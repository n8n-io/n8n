import { ref, watch, onUnmounted, type Ref } from 'vue';
import type { InstanceAiToolCallState } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { isRecord } from '@n8n/utils/is-record';
import type { ConfirmationSubmit } from '../../confirmationTransport';
import type { ThreadRuntime } from '../../instanceAi.store';
import type { TerminalState, WorkflowSetupApplyPayload } from '../workflowSetup.types';

const APPLY_TIMEOUT_MS = 60_000;
const WAIT_CANCELLED = Symbol('wait-cancelled');

type WaitForToolResult = Record<string, unknown> | null | typeof WAIT_CANCELLED;

export function useWorkflowSetupApply(deps: {
	requestId: Ref<string>;
	/** The current Assistant thread. The Assistant agent chat has none and passes `submit`. */
	thread: ThreadRuntime | undefined;
	/**
	 * Sends the answer through the caller instead of the thread. The caller
	 * resumes the tool, and the tool's result shows in the chat, so the card
	 * settles as soon as it sends.
	 */
	submit?: () => ConfirmationSubmit | undefined;
}): {
	terminalState: Ref<TerminalState | null>;
	apply: (payload: WorkflowSetupApplyPayload) => Promise<Record<string, unknown> | undefined>;
	defer: () => Promise<void>;
} {
	const toast = useToast();

	const terminalState = ref<TerminalState | null>(null);

	let cancelWait: (() => void) | null = null;

	onUnmounted(() => {
		cancelWait?.();
	});

	function waitForToolResult(requestId: string): {
		promise: Promise<WaitForToolResult>;
		cancel: () => void;
	} {
		let stopWatch: (() => void) | null = null;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		let resolveWait: ((result: WaitForToolResult) => void) | null = null;

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

		function finish(result: WaitForToolResult) {
			cleanup();
			resolveWait?.(result);
			resolveWait = null;
		}

		const promise = new Promise<WaitForToolResult>((resolve) => {
			resolveWait = resolve;
			const existing = deps.thread?.findToolCallByRequestId(requestId);
			if (existing?.result !== undefined) {
				finish(isRecord(existing.result) ? existing.result : null);
				return;
			}

			stopWatch = watch(
				() => {
					const tc: InstanceAiToolCallState | undefined =
						deps.thread?.findToolCallByRequestId(requestId);
					return tc?.result;
				},
				(result) => {
					if (result !== undefined) {
						finish(isRecord(result) ? result : null);
					}
				},
			);

			timeoutId = setTimeout(() => {
				finish(null);
			}, APPLY_TIMEOUT_MS);
		});

		return { promise, cancel: () => finish(WAIT_CANCELLED) };
	}

	async function apply(
		payload: WorkflowSetupApplyPayload,
	): Promise<Record<string, unknown> | undefined> {
		if (terminalState.value === 'applying') return;
		terminalState.value = 'applying';

		const submit = deps.submit?.();
		if (submit) {
			submit({ kind: 'setupWorkflowApply', ...payload });
			terminalState.value = 'applied';
			return;
		}
		if (!deps.thread) {
			terminalState.value = null;
			return;
		}
		const thread = deps.thread;

		const postSuccess = await thread.confirmAction(deps.requestId.value, {
			kind: 'setupWorkflowApply',
			...payload,
		});

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
		if (result === WAIT_CANCELLED) {
			terminalState.value = null;
			return;
		}

		if (result === null) {
			toast.showError(new Error('Apply timed out — please try again.'), 'Setup failed');
			terminalState.value = null;
			return;
		}

		if (result.success === true) {
			terminalState.value = result.partial === true ? 'partial' : 'applied';
			thread.resolveConfirmation(deps.requestId.value, 'approved');
			return result;
		}

		const message = typeof result.error === 'string' ? result.error : 'Apply failed.';
		toast.showError(new Error(message), 'Setup failed');
		terminalState.value = null;
		return undefined;
	}

	async function defer(): Promise<void> {
		if (terminalState.value === 'applying') return;
		terminalState.value = 'applying';

		const submit = deps.submit?.();
		if (submit) {
			submit({ kind: 'approval', approved: false });
			terminalState.value = 'deferred';
			return;
		}
		if (!deps.thread) {
			terminalState.value = null;
			return;
		}

		const success = await deps.thread.confirmAction(deps.requestId.value, {
			kind: 'approval',
			approved: false,
		});
		if (success) {
			terminalState.value = 'deferred';
			deps.thread.resolveConfirmation(deps.requestId.value, 'deferred');
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
