import { ref, type Ref } from 'vue';
import type { ConfirmationSubmit } from '../../confirmationTransport';
import type { TerminalState, WorkflowSetupApplyPayload } from '../workflowSetup.types';

/**
 * The wizard's apply and defer actions. The body goes through the caller
 * (Agents chat resume). The Agents chat removes the card once it resumes, so
 * the card does not wait for the tool result.
 */
export function useWorkflowSetupApply(deps: { submit: ConfirmationSubmit }): {
	terminalState: Ref<TerminalState | null>;
	apply: (payload: WorkflowSetupApplyPayload) => Promise<Record<string, unknown> | undefined>;
	defer: () => Promise<void>;
} {
	const terminalState = ref<TerminalState | null>(null);

	async function apply(
		payload: WorkflowSetupApplyPayload,
	): Promise<Record<string, unknown> | undefined> {
		if (terminalState.value === 'applying') return undefined;
		terminalState.value = 'applying';
		deps.submit({ kind: 'setupWorkflowApply', ...payload });
		return await Promise.resolve(undefined);
	}

	async function defer(): Promise<void> {
		if (terminalState.value === 'applying') return;
		terminalState.value = 'applying';
		deps.submit({ kind: 'approval', approved: false });
		terminalState.value = 'deferred';
		await Promise.resolve();
	}

	return {
		terminalState,
		apply,
		defer,
	};
}
