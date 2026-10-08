<script setup lang="ts">
/**
 * The card of `propose_automation`: what starts the workflow, its steps, where it runs and
 * who can see it. Each button sends a `capabilityDecision` with values that the card offered.
 */
import { computed, ref, useId } from 'vue';
import lowerFirst from 'lodash/lowerFirst';
import { I18nT } from 'vue-i18n';
import type { AutomationProposalCard, InstanceAiConfirmRequest } from '@n8n/api-types';
import { N8nBadge, N8nButton, N8nCard, N8nText, type ButtonVariant } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { describeSchedule } from '@/features/agents/utils/scheduleBuilder';
import { splitName } from '@/features/collaboration/projects/projects.utils';
import ConfirmationFooter from '../ConfirmationFooter.vue';
import {
	cardActions,
	decisionFor,
	hiddenStepCount,
	placeOf,
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
const nodeTypesStore = useNodeTypesStore();
const titleId = useId();
// The parent also guards, but the card must send one answer on its own.
const submitted = ref(false);

const isInactive = computed(() => props.disabled || submitted.value);
const actions = computed(() => cardActions(props.proposal));
const place = computed(() => placeOf(props.proposal));
const hiddenSteps = computed(() => hiddenStepCount(props.proposal));

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

// NodeIcon has no accessible name, so each icon gets the node name as its label.
const steps = computed(() =>
	visibleSteps(props.proposal).map((step, index) => {
		const nodeType = nodeTypesStore.getNodeType(step.type);
		return {
			key: `${index}:${step.type}`,
			nodeType,
			name: step.name,
			label: step.name || (nodeType?.displayName ?? step.type),
		};
	}),
);

const placeName = computed(
	() => place.value.linkedLabel ?? i18n.baseText('instanceAi.automation.place.thisComputer'),
);

// A personal project is named "First Last <email>". The card shows only the name.
const projectName = computed(() => {
	const { projectName: name, projectType } = props.proposal.visibleTo;
	if (projectType !== 'personal') return name;
	const parts = splitName(name);
	return parts.name ?? parts.email ?? name;
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

			<ul
				v-if="steps.length > 0"
				:class="$style.steps"
				:aria-label="i18n.baseText('instanceAi.automation.steps.label')"
				data-test-id="automation-proposal-steps"
			>
				<li v-for="step in steps" :key="step.key" :class="$style.step">
					<span role="img" :aria-label="step.label" :title="step.label" :class="$style.icon">
						<NodeIcon :node-type="step.nodeType" :node-name="step.name" :size="16" />
					</span>
				</li>
				<li v-if="hiddenSteps > 0" :class="$style.step">
					<N8nText size="small" color="text-base">
						{{
							i18n.baseText('instanceAi.automation.steps.more', {
								interpolate: { count: String(hiddenSteps) },
							})
						}}
					</N8nText>
				</li>
			</ul>

			<N8nText
				tag="div"
				size="small"
				color="text-dark"
				:class="$style.line"
				data-test-id="automation-proposal-place"
			>
				<I18nT
					:keypath="
						place.reasonKey
							? 'instanceAi.automation.place.runsOnWithReason'
							: 'instanceAi.automation.place.runsOn'
					"
					scope="global"
				>
					<template #place>
						<N8nBadge variant="outline">{{ placeName }}</N8nBadge>
					</template>
					<template v-if="place.reasonKey" #reason>{{ i18n.baseText(place.reasonKey) }}</template>
				</I18nT>
			</N8nText>

			<N8nText
				v-if="place.caveat"
				tag="div"
				size="small"
				color="text-base"
				data-test-id="automation-proposal-caveat"
			>
				{{ i18n.baseText('instanceAi.automation.place.localCaveat') }}
			</N8nText>

			<N8nText
				tag="div"
				size="small"
				color="text-dark"
				:class="$style.line"
				data-test-id="automation-proposal-visible-to"
			>
				<I18nT keypath="instanceAi.automation.visibleTo" scope="global">
					<template #project>
						<N8nBadge variant="outline" :class="$style.wrap">{{ projectName }}</N8nBadge>
					</template>
				</I18nT>
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

.line {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--4xs);
}

.steps {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.step {
	display: inline-flex;
	align-items: center;
}

.icon {
	display: inline-flex;
}

.footer {
	flex-wrap: wrap;
}
</style>
