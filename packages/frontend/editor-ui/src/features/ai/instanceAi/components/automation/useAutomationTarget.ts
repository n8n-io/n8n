import { computed, ref } from 'vue';
import { AUTOMATION_LOCAL_TARGET_ID } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

import { useExperienceMode } from '../../experience/useExperienceMode';
import type { RunTargetTranslate } from '../../runTarget/runTargetOptions';
import { useOptionalOpenThreadSummary } from '../../runTarget/useOpenThreadSummary';
import { useOptionalThreadSharing } from '../../sharing/threadSharingContext';
import { answerTargetId, chosenTargetId } from './automationProposal';
import {
	automationGate,
	credentialsUrl,
	initialTargetId,
	linkedProjectOf,
	linkedTargetOf,
	offersTargetChoice,
	targetOptions,
} from './automationTargets';
import type { ViewedProposal } from './automationViewerLinks';
import { useAutomationPreflight } from './useAutomationPreflight';

export interface AutomationTargetInput {
	/** The card, with the names of the viewer's own links. */
	proposal: () => ViewedProposal;
	/** True while the card waits for an answer that this viewer can give. */
	isOpen: () => boolean;
}

/**
 * Where the open automation card puts the workflow. Simple mode shows only the recommendation.
 * Power mode starts with the place of the chat when the card offers it, and lets the owner
 * change it. A linked place is checked first, so that the card can say what needs setting up.
 * A shared chat keeps its automations here, so its card sends this computer and checks nothing.
 */
export function useAutomationTarget(input: AutomationTargetInput) {
	const i18n = useI18n();
	const { isSimple } = useExperienceMode();
	const sharing = useOptionalThreadSharing();
	const chat = useOptionalOpenThreadSummary();

	// The server refuses a linked place in a shared chat, also for the owner. A teammate answers
	// as the owner, so the owner's links are not the teammate's to use either.
	const keepsHere = computed(
		() =>
			sharing?.view.value.role === 'teammate' ||
			sharing?.view.value.isShared === true ||
			chat.value?.sharedWith !== undefined,
	);
	const chatTargetId = computed(() => {
		const runTarget = chat.value?.runTarget;
		return runTarget?.kind === 'linked' ? runTarget.instanceId : undefined;
	});

	const picked = ref<string>();
	const targetId = computed(() => {
		const proposal = input.proposal();
		if (keepsHere.value) return chosenTargetId(proposal, AUTOMATION_LOCAL_TARGET_ID);
		const start = isSimple.value
			? answerTargetId(proposal)
			: initialTargetId(proposal, chatTargetId.value);
		return chosenTargetId(proposal, picked.value ?? start);
	});

	const translate: RunTargetTranslate = (key, params) =>
		i18n.baseText(key, params ? { interpolate: params } : undefined);

	const canChange = computed(
		() => !isSimple.value && !keepsHere.value && offersTargetChoice(input.proposal()),
	);
	const options = computed(() => targetOptions(input.proposal(), translate));
	const linkedTarget = computed(() => linkedTargetOf(input.proposal(), targetId.value));
	const setUpUrl = computed(() =>
		linkedTarget.value ? credentialsUrl(linkedTarget.value) : undefined,
	);

	const preflightRequest = computed(() => {
		const target = linkedTarget.value;
		if (!target || !input.isOpen() || keepsHere.value) return undefined;
		const { workflowId, versionId } = input.proposal();
		return { linkId: target.id, workflowId, versionId };
	});
	const { check, recheck } = useAutomationPreflight(preflightRequest);
	const gate = computed(() => automationGate(check.value));
	const linkedProject = computed(() => linkedProjectOf(check.value));

	/** Takes a place of the menu. A place that the card did not offer stays unchosen. */
	function choose(id: string | undefined) {
		if (options.value.some((option) => option.id === id && !option.disabled)) picked.value = id;
	}

	/**
	 * Keeps the workflow on this computer when it cannot go to the linked place. Simple mode has no
	 * menu, so this is its only way to another place.
	 */
	function keepHere() {
		choose(AUTOMATION_LOCAL_TARGET_ID);
	}

	return {
		targetId,
		canChange,
		options,
		linkedTarget,
		setUpUrl,
		check,
		gate,
		linkedProject,
		recheck,
		choose,
		keepHere,
	};
}
