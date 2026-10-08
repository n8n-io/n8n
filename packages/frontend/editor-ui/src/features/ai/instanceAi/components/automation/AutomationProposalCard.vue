<script setup lang="ts">
/**
 * The card of `propose_automation`: what starts the workflow, its steps, where it runs and
 * who can see it. Each button sends a `capabilityDecision` with values that the card offered.
 */
import { computed, ref, useId } from 'vue';
import lowerFirst from 'lodash/lowerFirst';
import type { AutomationProposalCard, InstanceAiConfirmRequest } from '@n8n/api-types';
import { N8nButton, N8nCard, N8nText, type ButtonVariant } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { describeSchedule } from '@/features/agents/utils/scheduleBuilder';
import ConfirmationFooter from '../ConfirmationFooter.vue';
import AutomationProposalPlace from './AutomationProposalPlace.vue';
import AutomationProposalSteps from './AutomationProposalSteps.vue';
import {
	activationNoteKey,
	cardActions,
	decisionFor,
	hiddenStepCount,
	liveStatusKey,
	titleKey,
	triggerLineKey,
	visibleSteps,
	type AutomationAction,
	type AutomationCardAction,
} from './automationProposal';

const props = defineProps<{
	proposal: AutomationProposalCard;
	disabled?: boolean;
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

const triggerText = computed(() => {
	const line = triggerLineKey(props.proposal.trigger);
	if (!line) return undefined;
	if (!('cron' in line)) return i18n.baseText(line.key);
	const description = describeSchedule(line.cron);
	if (!description) return i18n.baseText(line.fallbackKey);
	// cronstrue starts with a capital ("At 08:00"), and the copy puts it mid-sentence.
	return i18n.baseText(line.key, {
		interpolate: { description: lowerFirst(description), timezone: line.timezone ?? '' },
	});
});

function choose(action: AutomationAction) {
	if (isInactive.value) return;
	submitted.value = true;
	emit('submit', decisionFor(action, props.proposal));
}
</script>

<template>
	<N8nCard
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
