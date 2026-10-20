import { h, onBeforeUnmount, ref, watch, type Ref } from 'vue';
import { N8nButton } from '@n8n/design-system';
import { useToast, type NotificationHandle } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';

import type { PendingComposerDraft } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';
import { agentsEventBus, type AgentEvalFixRequest } from '../agents.eventBus';
import { useAgentEvalsStore } from '../agentEvals.store';

/** The agent as it was before the Assistant got the fix, for "Undo change". */
type EvalFixSnapshot = {
	projectId: string;
	agentId: string;
	instructions: string | null;
	configHash: string | null;
	datasetId?: string;
	checkCount: number;
};

/** How long the rerun message stays, so there is time to undo. */
const RERUN_TOAST_DURATION_MS = 10_000;

export type AgentEvalFixHandoffOptions = {
	projectId: Readonly<Ref<string>>;
	agentId: Readonly<Ref<string>>;
	/** False where the builder cannot reach the Assistant panel (artifact mode). */
	enabled: () => boolean;
	/** True while the Assistant changes this agent. */
	assistantBuilding: Readonly<Ref<boolean>>;
	/** True while the Assistant panel shows. */
	assistantShown: Readonly<Ref<boolean>>;
	/** Puts the draft into the Assistant's composer. Resolves to whether it landed. */
	handoff: (draft: PendingComposerDraft, onAccepted: () => void) => Promise<boolean>;
	/** Saves pending edits, so the snapshot is what the server holds. */
	saveEdits: () => Promise<unknown>;
	/** Reads the saved config again, after the Assistant changed it. */
	refreshConfig: () => Promise<unknown>;
	readInstructions: () => string | null;
	readConfigHash: () => string | null;
	/** Writes these instructions back. Resolves to whether the save landed. */
	writeInstructions: (instructions: string) => Promise<boolean>;
};

/**
 * Hands failing checks from the Checks tab to the Assistant, then runs the checks
 * again once the Assistant has changed the agent. The message that says so can
 * undo the change: it writes the instructions from before the hand-off back.
 */
export function useAgentEvalFixHandoff(options: AgentEvalFixHandoffOptions) {
	const i18n = useI18n();
	const toast = useToast();
	const store = useAgentEvalsStore();

	// Set once the hand-off lands, cleared when the run starts or the agent changes.
	const pendingFix = ref<EvalFixSnapshot | null>(null);
	let rerunToast: NotificationHandle | null = null;

	const isCurrent = (snapshot: EvalFixSnapshot) =>
		snapshot.projectId === options.projectId.value && snapshot.agentId === options.agentId.value;

	async function onEvalFixRequested(request: AgentEvalFixRequest) {
		if (!options.enabled()) return;
		if (
			request.projectId !== options.projectId.value ||
			request.agentId !== options.agentId.value
		) {
			return;
		}
		// A failed save was already reported. The snapshot then holds the last saved state.
		await options.saveEdits().catch(() => undefined);
		const snapshot: EvalFixSnapshot = {
			projectId: request.projectId,
			agentId: request.agentId,
			instructions: options.readInstructions(),
			configHash: options.readConfigHash(),
			datasetId: request.datasetId,
			checkCount: request.checkCount ?? 0,
		};
		await options.handoff(
			{ text: request.prompt, prefillType: 'handoff_agent_change_request' },
			() => {
				pendingFix.value = snapshot;
				store.setEvalFixInAssistant(snapshot.agentId, true);
			},
		);
	}

	function showRerunToast(message: string, onUndo?: () => void) {
		rerunToast?.close();
		const handle = toast.showMessage({
			type: 'success',
			duration: RERUN_TOAST_DURATION_MS,
			message: h('div', { 'data-testid': 'agent-eval-fix-toast' }, [
				h('span', message),
				onUndo
					? h(
							N8nButton,
							{
								variant: 'ghost',
								size: 'xsmall',
								'data-testid': 'agent-eval-fix-undo',
								onClick: () => {
									handle.close();
									onUndo();
								},
							},
							() => i18n.baseText('agents.builder.agentEvals.fix.undo'),
						)
					: null,
			]),
		});
		rerunToast = handle;
	}

	async function startRun(snapshot: EvalFixSnapshot) {
		if (!snapshot.datasetId) return false;
		try {
			await store.startRun(snapshot.projectId, snapshot.agentId, snapshot.datasetId);
			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText('agents.builder.agentEvals.review.rerunError'));
			return false;
		}
	}

	async function undoChange(snapshot: EvalFixSnapshot) {
		if (!isCurrent(snapshot) || snapshot.instructions === null) return;
		let saved = false;
		try {
			saved = await options.writeInstructions(snapshot.instructions);
		} catch (error) {
			toast.showError(error, i18n.baseText('agents.builder.agentEvals.fix.undoError'));
			return;
		}
		if (!saved) {
			toast.showError(
				new Error('The instructions were not saved'),
				i18n.baseText('agents.builder.agentEvals.fix.undoError'),
			);
			return;
		}
		if (!(await startRun(snapshot))) return;
		showRerunToast(
			i18n.baseText('agents.builder.agentEvals.fix.undone', {
				adjustToNumber: snapshot.checkCount,
				interpolate: { count: String(snapshot.checkCount) },
			}),
		);
	}

	// The Assistant finished a build after the hand-off: run every check again.
	async function onAssistantBuilt() {
		const snapshot = pendingFix.value;
		if (!snapshot || !isCurrent(snapshot)) return;
		pendingFix.value = null;
		try {
			await options.refreshConfig();
		} catch {
			// The run below still reads the saved config on the server.
		}
		if (!isCurrent(snapshot)) return;
		const instructionsChanged =
			snapshot.instructions !== null && options.readInstructions() !== snapshot.instructions;
		if (!(await startRun(snapshot))) return;
		const count = {
			adjustToNumber: snapshot.checkCount,
			interpolate: { count: String(snapshot.checkCount) },
		};
		if (instructionsChanged) {
			showRerunToast(i18n.baseText('agents.builder.agentEvals.fix.updated', count), () => {
				void undoChange(snapshot);
			});
		} else {
			showRerunToast(i18n.baseText('agents.builder.agentEvals.fix.rerunning', count));
		}
	}

	watch(options.assistantBuilding, (building, wasBuilding) => {
		if (wasBuilding && !building) void onAssistantBuilt();
	});

	// Once the Assistant panel closes, the Checks tab offers its fix action again.
	watch(options.assistantShown, (shown) => {
		if (!shown && options.agentId.value) {
			store.setEvalFixInAssistant(options.agentId.value, false);
		}
	});

	watch([options.projectId, options.agentId], (_next, [, previousAgentId]) => {
		pendingFix.value = null;
		if (previousAgentId) store.setEvalFixInAssistant(previousAgentId, false);
	});

	agentsEventBus.on('evalFixRequested', onEvalFixRequested);
	onBeforeUnmount(() => {
		agentsEventBus.off('evalFixRequested', onEvalFixRequested);
	});

	return { pendingFix };
}
