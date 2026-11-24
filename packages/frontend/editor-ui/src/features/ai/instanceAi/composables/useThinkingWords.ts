import type { BaseTextKey } from '@n8n/i18n';
import { useI18n } from '@n8n/i18n';
import { useIntervalFn } from '@vueuse/core';
import { computed, ref, watch, type InjectionKey, type Ref } from 'vue';

/** How long each thinking word shows. */
export const THINKING_WORD_ROTATION_MS = 2000;

/** Words for any generic thinking state. */
export const GENERAL_THINKING_WORD_KEYS: readonly BaseTextKey[] = [
	'instanceAi.thinkingWord.general.thinking',
	'instanceAi.thinkingWord.general.working',
	'instanceAi.thinkingWord.general.considering',
	'instanceAi.thinkingWord.general.reasoning',
	'instanceAi.thinkingWord.general.analyzing',
	'instanceAi.thinkingWord.general.assessing',
	'instanceAi.thinkingWord.general.evaluating',
	'instanceAi.thinkingWord.general.exploring',
	'instanceAi.thinkingWord.general.interpreting',
	'instanceAi.thinkingWord.general.preparing',
	'instanceAi.thinkingWord.general.organizing',
	'instanceAi.thinkingWord.general.formulating',
	'instanceAi.thinkingWord.general.stillWorking',
	'instanceAi.thinkingWord.general.consideringOptions',
	'instanceAi.thinkingWord.general.workingThroughDetails',
	'instanceAi.thinkingWord.general.weighingTheOptions',
	'instanceAi.thinkingWord.general.consideringTheContext',
	'instanceAi.thinkingWord.general.consideringAnApproach',
	'instanceAi.thinkingWord.general.makingSenseOfTheRequest',
	'instanceAi.thinkingWord.general.reasoningThroughTheDetails',
	'instanceAi.thinkingWord.general.preparingAResponse',
	'instanceAi.thinkingWord.general.developingAResponse',
	'instanceAi.thinkingWord.general.formingAnAnswer',
	'instanceAi.thinkingWord.general.connectingIdeas',
	'instanceAi.thinkingWord.general.followingTheLogic',
	'instanceAi.thinkingWord.general.joiningTheDots',
	'instanceAi.thinkingWord.general.findingAPathThrough',
	'instanceAi.thinkingWord.general.untanglingTheLogic',
	'instanceAi.thinkingWord.general.puttingThePiecesTogether',
	'instanceAi.thinkingWord.general.findingTheMissingLink',
	'instanceAi.thinkingWord.general.findingHowThingsFit',
	'instanceAi.thinkingWord.general.puttingIdeasInOrder',
	'instanceAi.thinkingWord.general.mappingOutPossibilities',
	'instanceAi.thinkingWord.general.givingTheIdeaSomeStructure',
	'instanceAi.thinkingWord.general.tracingTheConnections',
];

/** Workflow words. They are confusing in other chats, so they show only while a workflow builds. */
export const WORKFLOW_THINKING_WORD_KEYS: readonly BaseTextKey[] = [
	'instanceAi.thinkingWord.workflow.consideringTheBranches',
	'instanceAi.thinkingWord.workflow.workingOutTheIfs',
	'instanceAi.thinkingWord.workflow.sortingTheIfsAndThens',
	'instanceAi.thinkingWord.workflow.workingOutWhatFollows',
	'instanceAi.thinkingWord.workflow.wiringUpAThought',
	'instanceAi.thinkingWord.workflow.fromIdeaToWorkflow',
	'instanceAi.thinkingWord.workflow.fromThisToThat',
	'instanceAi.thinkingWord.workflow.betweenTriggerAndOutcome',
	'instanceAi.thinkingWord.workflow.aThoughtBranchesOut',
	'instanceAi.thinkingWord.workflow.routingAFewIdeas',
	'instanceAi.thinkingWord.workflow.mappingTheWhatAndHow',
	'instanceAi.thinkingWord.workflow.turningIdeasIntoLogic',
	'instanceAi.thinkingWord.workflow.givingTheLogicAShape',
];

/** The thinking word of the thread, for each place that would show the generic "Thinking". */
export const ThinkingWordKey: InjectionKey<Readonly<Ref<string | undefined>>> =
	Symbol('ThinkingWord');

function pickRandom<T>(items: readonly T[]): T {
	return items[Math.floor(Math.random() * items.length)];
}

/**
 * A thinking word while the thread is active, a different one every rotation.
 * A word repeats in a thread only after all words showed.
 */
export function useThinkingWordRotation(options: {
	active: () => boolean;
	building: () => boolean;
	threadId: () => string;
}) {
	const i18n = useI18n();
	const used = new Set<BaseTextKey>();
	const current = ref<BaseTextKey>();

	function next() {
		const words = options.building()
			? [...GENERAL_THINKING_WORD_KEYS, ...WORKFLOW_THINKING_WORD_KEYS]
			: GENERAL_THINKING_WORD_KEYS;
		let unused = words.filter((key) => !used.has(key));
		if (unused.length === 0) {
			words.forEach((key) => used.delete(key));
			unused = words.filter((key) => key !== current.value);
		}
		current.value = pickRandom(unused);
		used.add(current.value);
	}

	const rotation = useIntervalFn(next, THINKING_WORD_ROTATION_MS, { immediate: false });

	watch(options.threadId, () => used.clear());
	watch(
		options.active,
		(active) => {
			if (active) {
				next();
				rotation.resume();
			} else {
				rotation.pause();
				current.value = undefined;
			}
		},
		{ immediate: true },
	);

	return computed(() => (current.value ? i18n.baseText(current.value) : undefined));
}
