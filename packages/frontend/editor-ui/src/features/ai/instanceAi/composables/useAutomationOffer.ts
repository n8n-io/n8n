import { computed, reactive, watch, type ComputedRef } from 'vue';
import { useI18n } from '@n8n/i18n';

import type { IWorkflowDb } from '@/Interface';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import {
	automationOfferKey,
	countSuccessfulRuns,
	findAutomationOfferCandidate,
	type AutomationOfferCandidate,
	type AutomationOfferWorkflow,
} from '../automationOffer';
import { getDismissedContextKeys } from '../instanceAi.handoffContext';
import { useInstanceAiStore, type ThreadRuntime } from '../instanceAi.store';

type WorkflowState = 'unpublished' | 'published' | 'archived' | 'failed';

/** A run that failed outside the tool calls, as the preview canvas reports it. */
export interface PreviewRunFailure {
	workflowId: string;
	executionId: string;
}

export interface AutomationOffer {
	/** The workflow to offer, or undefined when the panel stays hidden. */
	readonly offer: AutomationOfferCandidate | undefined;
	/** Asks the Assistant to make the workflow automatic and hides the offer for good. */
	accept: () => Promise<void>;
	/** Hides the offer for good without a message. */
	dismiss: () => Promise<void>;
}

function readWorkflowState(
	workflow: Pick<IWorkflowDb, 'active' | 'activeVersionId' | 'isArchived'>,
): WorkflowState {
	if (workflow.isArchived) return 'archived';
	// `active` is deprecated in favour of `activeVersionId`. Check both, so that
	// a cache entry with only one of them cannot read as unpublished.
	return workflow.active || Boolean(workflow.activeVersionId) ? 'published' : 'unpublished';
}

/**
 * Stored state of a workflow. Reads the workflows list cache first, else
 * fetches the workflow one time. Until the fetch settles the state is
 * undefined. A failed fetch gives 'failed', so the caller shows no offer.
 */
function useWorkflowStates() {
	const workflowsListStore = useWorkflowsListStore();
	const fetched = reactive(new Map<string, WorkflowState | 'loading'>());

	function read(workflowId: string): WorkflowState | undefined {
		const cached = workflowsListStore.getWorkflowById(workflowId);
		if (cached) return readWorkflowState(cached);
		const state = fetched.get(workflowId);
		return state === 'loading' ? undefined : state;
	}

	async function load(workflowId: string): Promise<void> {
		if (workflowsListStore.getWorkflowById(workflowId) || fetched.has(workflowId)) return;
		fetched.set(workflowId, 'loading');
		try {
			const workflow = await workflowsListStore.fetchWorkflow(workflowId);
			fetched.set(workflowId, readWorkflowState(workflow));
		} catch {
			fetched.set(workflowId, 'failed');
		}
	}

	return { read, load };
}

/**
 * Dismissed offers. The thread metadata keeps them across reloads. The local
 * set hides an offer at once, also when the metadata write fails or the thread
 * is not in the local thread lists.
 */
function useOfferDismissals(
	thread: ThreadRuntime,
	instanceAiStore: ReturnType<typeof useInstanceAiStore>,
) {
	const hiddenWorkflowIds = reactive(new Set<string>());

	const keys = computed(() => [
		...getDismissedContextKeys(instanceAiStore.getThreadMetadata(thread.id)),
		...[...hiddenWorkflowIds].map(automationOfferKey),
	]);

	async function persist(workflowId: string): Promise<void> {
		hiddenWorkflowIds.add(workflowId);
		const stored = new Set(getDismissedContextKeys(instanceAiStore.getThreadMetadata(thread.id)));
		stored.add(automationOfferKey(workflowId));
		try {
			await instanceAiStore.updateThreadMetadata(thread.id, { dismissedContextKeys: [...stored] });
		} catch {
			// The local set keeps the offer hidden for this session.
		}
	}

	return {
		keys,
		persist,
		hide: (workflowId: string) => hiddenWorkflowIds.add(workflowId),
		show: (workflowId: string) => hiddenWorkflowIds.delete(workflowId),
	};
}

/**
 * Preview runs that failed, as workflow id to the number of successful run
 * calls at the time of the failure. Only a newer successful run brings the
 * offer back. The view keeps the last report after the user dismisses it, so
 * a report is recorded one time for each execution.
 */
function usePreviewFailures(
	thread: ThreadRuntime,
	latestFailure: () => PreviewRunFailure | null | undefined,
): ReadonlyMap<string, number> {
	const failures = reactive(new Map<string, number>());
	watch(
		() => latestFailure()?.executionId,
		() => {
			const failure = latestFailure();
			if (!failure) return;
			failures.set(failure.workflowId, countSuccessfulRuns(thread.messages, failure.workflowId));
		},
		{ immediate: true },
	);
	return failures;
}

/**
 * Accept and dismiss. Both remove the panel that holds the focused button, so
 * both move the focus to the composer, where the user continues.
 */
function useOfferActions(
	thread: ThreadRuntime,
	offer: ComputedRef<AutomationOfferCandidate | undefined>,
	dismissals: ReturnType<typeof useOfferDismissals>,
	focusComposer: () => void,
) {
	const i18n = useI18n();

	async function accept(): Promise<void> {
		const current = offer.value;
		if (!current) return;
		// Hide at once so a second click cannot send the message again.
		dismissals.hide(current.workflowId);
		focusComposer();
		let sent = false;
		try {
			sent = await thread.sendMessage(
				i18n.baseText('instanceAi.automationOffer.prompt', {
					interpolate: { name: current.name },
				}),
				{ authorship: { kind: 'prefill', prefillType: 'automation_offer' } },
			);
		} finally {
			// Show the offer again after a failed send, so the user can try again.
			if (!sent) dismissals.show(current.workflowId);
		}
		if (sent) await dismissals.persist(current.workflowId);
	}

	async function dismiss(): Promise<void> {
		const current = offer.value;
		if (!current) return;
		focusComposer();
		await dismissals.persist(current.workflowId);
	}

	return { accept, dismiss };
}

/**
 * The "Make it automatic" offer of a thread: a workflow from the thread ran
 * successfully, it is not active or archived, and the chat is idle.
 *
 * Pass the thread runtime from the component that provides it, because that
 * component cannot inject what it provides. `latestPreviewFailure` gives the
 * last run that failed in the preview canvas, which the tool calls do not show.
 */
export function useAutomationOffer(
	thread: ThreadRuntime,
	latestPreviewFailure: () => PreviewRunFailure | null | undefined = () => undefined,
): AutomationOffer {
	const instanceAiStore = useInstanceAiStore();
	const workflowStates = useWorkflowStates();
	const dismissals = useOfferDismissals(thread, instanceAiStore);
	const previewFailures = usePreviewFailures(thread, latestPreviewFailure);

	// The same rule as the fix-with-AI offer.
	const isChatInProgress = computed(
		() => thread.isStreaming || thread.isSendingMessage || thread.isAwaitingConfirmation,
	);

	// A published or archived workflow or a failed fetch drops out, so an older
	// workflow can take its place. A workflow whose state is not known yet stays
	// in, so the finder can pick it and the watch below can load its state.
	const offerableWorkflows = computed(() => {
		const workflows: AutomationOfferWorkflow[] = [];
		for (const entry of thread.producedArtifacts.values()) {
			if (entry.type !== 'workflow') continue;
			const state = workflowStates.read(entry.id);
			if (state === undefined || state === 'unpublished') workflows.push(entry);
		}
		return workflows;
	});

	const candidate = computed(() => {
		// Skip the walk while busy: the messages change with each streamed part.
		if (isChatInProgress.value) return undefined;
		return findAutomationOfferCandidate({
			messages: thread.messages,
			producedWorkflows: offerableWorkflows.value,
			dismissedKeys: dismissals.keys.value,
			previewFailures,
		});
	});

	watch(
		() => candidate.value?.workflowId,
		(workflowId) => {
			if (workflowId) void workflowStates.load(workflowId);
		},
		{ immediate: true },
	);

	const offer = computed(() => {
		const current = candidate.value;
		if (!current || workflowStates.read(current.workflowId) !== 'unpublished') return undefined;
		return current;
	});

	const actions = useOfferActions(thread, offer, dismissals, () =>
		instanceAiStore.requestComposerFocus(),
	);

	return reactive({ offer, ...actions });
}
