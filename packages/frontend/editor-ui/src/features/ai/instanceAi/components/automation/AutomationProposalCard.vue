<script setup lang="ts">
/**
 * The card of `propose_automation`: what starts the workflow, its steps, where it runs and
 * who can see it. Each button sends a `capabilityDecision` with values that the card offered.
 */
import { computed, ref, useId, watch } from 'vue';
import type { AutomationProposalCard, InstanceAiConfirmRequest } from '@n8n/api-types';
import { N8nButton, N8nCard, N8nText, type ButtonVariant } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { capabilityDecisionOf } from '@/features/ai/shared/agentsChat/resolvedCards';
import ConfirmationFooter from '../ConfirmationFooter.vue';
import AutomationProposalPlace from './AutomationProposalPlace.vue';
import AutomationProposalResolved from './AutomationProposalResolved.vue';
import AutomationProposalSteps from './AutomationProposalSteps.vue';
import {
	actionOf,
	activationNoteKey,
	cardActions,
	decisionFor,
	hiddenStepCount,
	liveStatusKey,
	titleKey,
	visibleSteps,
	type AutomationAction,
	type AutomationCardAction,
} from './automationProposal';
import { triggerText as describeTrigger } from './automationText';

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

const isInactive = computed(() => props.disabled || submitted.value);
const actions = computed(() => cardActions(props.proposal));
const steps = computed(() => visibleSteps(props.proposal));
const hiddenSteps = computed(() => hiddenStepCount(props.proposal));
const statusKey = computed(() => liveStatusKey(props.proposal));
const noteKey = computed(() => activationNoteKey(props.proposal));

const triggerText = computed(() => describeTrigger(props.proposal.trigger));

/** The button that the answer stands for. Only a capability answer resolves the card. */
const answeredAction = computed(() => {
	const decision = capabilityDecisionOf(props.resolvedValue);
	return decision === undefined ? undefined : actionOf(decision);
});

// A failed answer opens the same card again, so its buttons must work again.
watch(answeredAction, (now, before) => {
	if (before !== undefined && now === undefined) submitted.value = false;
});

function choose(action: AutomationAction) {
	if (isInactive.value) return;
	submitted.value = true;
	emit('submit', decisionFor(action, props.proposal));
}
</script>

<template>
	<!-- The answer of this card moves focus to the outcome, because its buttons go away. -->
	<AutomationProposalResolved
		v-if="answeredAction"
		:proposal="proposal"
		:action="answeredAction"
		:tool-call-id="toolCallId"
		:takes-focus="submitted"
	/>
	<N8nCard
		v-else
		:class="$style.card"
		role="group"
		:aria-labelledby="titleId"
		data-test-id="automation-proposal-card"
	>
		<div :class="$style.body">
			<div :class="$style.head">
				<N8nText :id="titleId" tag="div" size="medium" bold color="text-dark">
					{{ i18n.baseText(titleKey(proposal)) }}
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
					v-if="statusKey"
					tag="div"
					size="small"
					color="text-dark"
					data-test-id="automation-proposal-status"
				>
					{{ i18n.baseText(statusKey) }}
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

			<AutomationProposalPlace :proposal="proposal" />

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
				:disabled="isInactive"
				:data-test-id="BUTTON_TEST_IDS[entry.action]"
				@click="choose(entry.action)"
			>
				{{ i18n.baseText(entry.labelKey) }}
			</N8nButton>
		</ConfirmationFooter>
	</N8nCard>
</template>

<style lang="scss" module>
// The same container as the other Assistant cards in InstanceAiConfirmationCard.vue.
.card {
	--card--padding: 0;
	border: 0;
	background-color: var(--color--background--light-3);
	box-shadow: var(--shadow--sm), var(--shadow--outline);
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
