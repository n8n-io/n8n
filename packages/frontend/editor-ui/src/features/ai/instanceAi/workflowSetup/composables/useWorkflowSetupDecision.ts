import { onUnmounted, ref, watch, type Ref } from 'vue';
import type {
	TerminalState,
	WorkflowSetupApplyPayload,
	WorkflowSetupOutcome,
} from '../workflowSetup.types';

type SetupResult = Record<string, unknown> | undefined;

/**
 * The card's apply and defer. Each one hands the answer to the parent, and waits
 * for the parent to settle it through `outcome`. The card itself never sends the
 * answer.
 */
export function useWorkflowSetupDecision(deps: {
	outcome: Ref<WorkflowSetupOutcome | undefined>;
	emitApply: (payload: WorkflowSetupApplyPayload) => void;
	emitDefer: () => void;
}): {
	terminalState: Ref<TerminalState | null>;
	apply: (payload: WorkflowSetupApplyPayload) => Promise<SetupResult>;
	defer: () => Promise<void>;
} {
	const terminalState = ref<TerminalState | null>(null);
	let settle: ((result: SetupResult) => void) | undefined;

	// Each outcome is a new object, so a second failure settles the next answer too.
	watch(deps.outcome, (outcome) => {
		if (!outcome) return;
		terminalState.value = outcome.state === 'failed' ? null : outcome.state;
		settle?.(outcome.result);
		settle = undefined;
	});

	onUnmounted(() => {
		settle?.(undefined);
		settle = undefined;
	});

	async function hand(emitAnswer: () => void): Promise<SetupResult> {
		terminalState.value = 'applying';
		const settled = new Promise<SetupResult>((resolve) => {
			settle = resolve;
		});
		emitAnswer();
		return await settled;
	}

	async function apply(payload: WorkflowSetupApplyPayload): Promise<SetupResult> {
		if (terminalState.value === 'applying') return undefined;
		return await hand(() => deps.emitApply(payload));
	}

	async function defer(): Promise<void> {
		if (terminalState.value === 'applying') return;
		await hand(deps.emitDefer);
	}

	return { terminalState, apply, defer };
}
