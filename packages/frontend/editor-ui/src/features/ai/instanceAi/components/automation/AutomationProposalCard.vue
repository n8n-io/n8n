<script setup lang="ts">
/**
 * The card of `propose_automation`: what starts the workflow, its steps, where it runs and
 * who can see it. Each button sends a `capabilityDecision` with values that the card offered.
 * A linked place is checked first: "Turn it on" waits while credentials there need setting up.
 * The card names linked places from the viewer's own links, because it holds only their ids.
 */
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue';
import type { AutomationProposalCard, InstanceAiConfirmRequest } from '@n8n/api-types';
import { N8nButton, N8nCard, N8nText, type ButtonVariant } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { capabilityDecisionOf } from '@/features/ai/shared/agentsChat/resolvedCards';
import ConfirmationFooter from '../ConfirmationFooter.vue';
import AutomationPreflightNotice from './AutomationPreflightNotice.vue';
import AutomationProposalPlace from './AutomationProposalPlace.vue';
import AutomationProposalResolved from './AutomationProposalResolved.vue';
import AutomationProposalSteps from './AutomationProposalSteps.vue';
import AutomationTargetPicker from './AutomationTargetPicker.vue';
import {
	actionOf,
	activationNoteKey,
	cardActions,
	decisionFor,
	hiddenStepCount,
	liveStatusKey,
	placeOf,
	shownWorkflowName,
	titleKey,
	visibleSteps,
	type AutomationAction,
	type AutomationCardAction,
} from './automationProposal';
import { preflightHasNotice } from './automationTargets';
import { placeName, triggerText as describeTrigger } from './automationText';
import { hasLinkedTargets, withViewerLinks } from './automationViewerLinks';
import { useAutomationTarget } from './useAutomationTarget';
import { useViewerLinks } from './useViewerLinks';

const props = defineProps<{
	proposal: AutomationProposalCard;
	disabled?: boolean;
	/** The answer of a resolved card. With it, the card shows what happened. */
	resolvedValue?: unknown;
	/** The tool call behind the card. The answered card reads its result. */
	toolCallId?: string;
}>();

const emit = defineEmits<{
	submit: [body: InstanceAiConfirmRequest];
}>();

const BUTTON_VARIANTS: Record<AutomationCardAction['type'], ButtonVariant> = {
	primary: 'solid',
	secondary: 'outline',
	tertiary: 'ghost',
};

const BUTTON_TEST_IDS: Record<AutomationAction, string> = {
	activate: 'automation-proposal-turn-on',
	save: 'automation-proposal-save',
	decline: 'automation-proposal-not-now',
};

const i18n = useI18n();
const titleId = useId();
// The parent also guards, but the card must send one answer on its own.
const submitted = ref(false);

const links = useViewerLinks(() => hasLinkedTargets(props.proposal));
const viewed = computed(() => withViewerLinks(props.proposal, links.value));

const isInactive = computed(() => props.disabled || submitted.value);
const workflowName = computed(() => shownWorkflowName(viewed.value));
const steps = computed(() => visibleSteps(viewed.value));
const hiddenSteps = computed(() => hiddenStepCount(viewed.value));

/** The button that the answer stands for. Only a capability answer resolves the card. */
const answeredDecision = computed(() => capabilityDecisionOf(props.resolvedValue));
const answeredAction = computed(() =>
	answeredDecision.value === undefined ? undefined : actionOf(answeredDecision.value),
);
const answeredTarget = computed(() => {
	const target = answeredDecision.value?.values?.target;
	return typeof target === 'string' ? target : undefined;
});

const {
	targetId,
	canChange,
	options,
	linkedTarget,
	setUpUrl,
	check,
	gate,
	recheck,
	choose,
	keepHere,
	linkedProject,
} = useAutomationTarget({
	proposal: () => viewed.value,
	isOpen: () => answeredAction.value === undefined && !isInactive.value,
});
const chosenTarget = computed({
	get: () => targetId.value,
	set: (id) => choose(id),
});
const place = computed(() => placeName(placeOf(viewed.value, targetId.value)));
const linkedPlace = computed(() => (linkedTarget.value ? place.value : undefined));

// The buttons, the title and the lines describe the place that the answer sends.
const actions = computed(() => cardActions(viewed.value, targetId.value));
const statusKey = computed(() => liveStatusKey(viewed.value, targetId.value));
const noteKey = computed(() => activationNoteKey(viewed.value, targetId.value));
const title = computed(() =>
	i18n.baseText(titleKey(viewed.value, targetId.value), { interpolate: { place: place.value } }),
);
const triggerText = computed(() =>
	describeTrigger(viewed.value.trigger, 'line', linkedPlace.value),
);

/** "Turn it on" waits while the linked place needs set-up, and both wait for its check. */
function isActionDisabled(action: AutomationAction): boolean {
	if (isInactive.value) return true;
	if (action === 'activate') return !gate.value.canTurnOn;
	if (action === 'save') return !gate.value.canSave;
	return false;
}

const openCard = useTemplateRef<InstanceType<typeof N8nCard>>('openCard');

/** True when no element of the page has focus, for example after the focused one went away. */
function isFocusLost(): boolean {
	const active = document.activeElement;
	return active === null || active === document.body || !active.isConnected;
}

function focusCard() {
	const element: unknown = openCard.value?.$el;
	if (element instanceof HTMLElement) element.focus({ preventScroll: true });
}

// A failed answer opens the same card again, so its buttons must work again. The outcome had
// focus and goes away, so focus moves to the card. Focus that the user moved elsewhere stays.
watch(answeredAction, async (now, before) => {
	if (before === undefined || now !== undefined) return;
	submitted.value = false;
	await nextTick();
	if (isFocusLost()) focusCard();
});

/** The notice and its button go away, so focus moves to the card. */
async function keepOnThisComputer() {
	keepHere();
	await nextTick();
	focusCard();
}

/** The notice shows only its "Checking" line while the check runs, so focus moves to the card. */
async function checkAgain() {
	recheck();
	await nextTick();
	if (isFocusLost()) focusCard();
}

function answer(action: AutomationAction) {
	if (isActionDisabled(action)) return;
	submitted.value = true;
	emit('submit', decisionFor(action, viewed.value, targetId.value));
}
</script>

<template>
	<!-- The answer of this card moves focus to the outcome, because its buttons go away. -->
	<AutomationProposalResolved
		v-if="answeredAction"
		:proposal="viewed"
		:action="answeredAction"
		:target-id="answeredTarget"
		:tool-call-id="toolCallId"
		:takes-focus="submitted"
	/>
	<N8nCard
		v-else
		ref="openCard"
		:class="$style.card"
		role="group"
		:aria-labelledby="titleId"
		tabindex="-1"
		data-test-id="automation-proposal-card"
	>
		<div :class="$style.body">
			<div :class="$style.head">
				<N8nText :id="titleId" tag="div" size="medium" bold color="text-dark">
					{{ title }}
				</N8nText>
				<N8nText
					tag="div"
					size="small"
					color="text-base"
					:class="$style.wrap"
					data-test-id="automation-proposal-name"
				>
					{{ proposal.title }}
				</N8nText>
				<N8nText
					v-if="workflowName"
					tag="div"
					size="small"
					color="text-base"
					:class="$style.wrap"
					data-test-id="automation-proposal-workflow-name"
				>
					{{
						i18n.baseText('instanceAi.automation.workflowName', {
							interpolate: { name: workflowName },
						})
					}}
				</N8nText>
				<N8nText
					v-if="statusKey"
					tag="div"
					size="small"
					color="text-dark"
					data-test-id="automation-proposal-status"
				>
					{{ i18n.baseText(statusKey, { interpolate: { place } }) }}
				</N8nText>
			</div>

			<N8nText
				v-if="triggerText"
				tag="div"
				size="small"
				color="text-dark"
				data-test-id="automation-proposal-trigger"
			>
				{{ triggerText }}
			</N8nText>

			<AutomationProposalSteps v-if="steps.length > 0" :steps="steps" :hidden-count="hiddenSteps" />

			<AutomationProposalPlace
				:proposal="viewed"
				:target-id="chosenTarget"
				:linked-project="linkedProject"
			>
				<template v-if="canChange" #change>
					<AutomationTargetPicker
						v-model="chosenTarget"
						:options="options"
						:disabled="isInactive"
					/>
				</template>
			</AutomationProposalPlace>

			<AutomationPreflightNotice
				v-if="linkedPlace && preflightHasNotice(check)"
				:check="check"
				:place="linkedPlace"
				:set-up-url="setUpUrl"
				:disabled="isInactive"
				:offers-keep-here="!canChange"
				@recheck="checkAgain"
				@keep-here="keepOnThisComputer"
			/>

			<N8nText
				v-if="noteKey"
				tag="div"
				size="small"
				color="text-base"
				data-test-id="automation-proposal-note"
			>
				{{ i18n.baseText(noteKey) }}
			</N8nText>
		</div>

		<ConfirmationFooter :class="$style.footer">
			<N8nButton
				v-for="entry in actions"
				:key="entry.action"
				:variant="BUTTON_VARIANTS[entry.type]"
				size="small"
				:disabled="isActionDisabled(entry.action)"
				:data-test-id="BUTTON_TEST_IDS[entry.action]"
				@click="answer(entry.action)"
			>
				{{ i18n.baseText(entry.labelKey) }}
			</N8nButton>
		</ConfirmationFooter>
	</N8nCard>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus' as focus;

// The same container as the other Assistant cards in InstanceAiConfirmationCard.vue.
.card {
	--card--padding: 0;
	border: 0;
	background-color: var(--color--background--light-3);
	box-shadow: var(--shadow--sm), var(--shadow--outline);

	@include focus.focus-visible-ring;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) var(--spacing--sm) 0;
}

.head {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.wrap {
	overflow-wrap: anywhere;
}

.footer {
	flex-wrap: wrap;
}
</style>
