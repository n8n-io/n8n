<script setup lang="ts">
/**
 * An answered automation card: one line that says what happened, and a link to the workflow
 * when it was kept. The answer gives the first state. The result of the tool step, when it
 * arrives, says if the workflow is really on.
 */
import { computed, onMounted, useId, useTemplateRef } from 'vue';
import { I18nT } from 'vue-i18n';
import type { AutomationProposalCard } from '@n8n/api-types';
import { N8nBadge, N8nCard, N8nIcon, N8nLink, N8nText, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/app/constants';
import { useOptionalThread } from '../../instanceAi.store';
import { placeOf, type AutomationAction } from './automationProposal';
import { resolvedStatus, toolOutcome, type AutomationResolvedTone } from './automationResolved';
import { placeName, triggerText } from './automationText';

const props = defineProps<{
	proposal: AutomationProposalCard;
	action: AutomationAction;
	/** The tool call behind the card. Without it, the line shows what the answer asked for. */
	toolCallId?: string;
	/** True when the user answered in this card, so focus moves here from the removed buttons. */
	takesFocus?: boolean;
}>();

const TONE_ICONS: Record<AutomationResolvedTone, IconName | undefined> = {
	success: 'circle-check',
	warning: 'triangle-alert',
	neutral: undefined,
};

const i18n = useI18n();
const thread = useOptionalThread();
const statusId = useId();
const root = useTemplateRef<InstanceType<typeof N8nCard>>('root');

const outcome = computed(() => {
	if (!props.toolCallId) return undefined;
	const call = thread?.findToolCall(props.toolCallId);
	return call === undefined ? undefined : toolOutcome(call);
});

const status = computed(() => resolvedStatus(props.action, props.proposal, outcome.value));
// "Not now" ends the card without a result to report, so it shows a neutral sign.
const icon = computed<IconName | undefined>(() =>
	status.value.kind === 'declined' ? 'circle-minus' : TONE_ICONS[status.value.tone],
);
const trigger = computed(() => triggerText(props.proposal.trigger, 'clause'));
const place = computed(() => placeName(placeOf(props.proposal)));
const workflowRoute = computed(() => ({
	name: VIEWS.WORKFLOW,
	params: { workflowId: props.proposal.workflowId },
}));

onMounted(() => {
	if (!props.takesFocus) return;
	const element: unknown = root.value?.$el;
	if (element instanceof HTMLElement) element.focus({ preventScroll: true });
});
</script>

<template>
	<N8nCard
		ref="root"
		:class="[$style.card, $style[status.tone]]"
		role="group"
		:aria-labelledby="statusId"
		tabindex="-1"
		data-test-id="automation-proposal-resolved"
	>
		<div :class="$style.row">
			<N8nIcon v-if="icon" :icon="icon" :class="$style.icon" aria-hidden="true" />
			<N8nText
				:id="statusId"
				tag="p"
				size="small"
				:class="$style.status"
				role="status"
				aria-live="polite"
				aria-atomic="true"
				:data-status="status.kind"
				data-test-id="automation-proposal-resolved-status"
			>
				<I18nT :keypath="status.messageKey" scope="global">
					<template #title>{{ proposal.title }}</template>
					<template #trigger>{{ trigger }}</template>
					<template #place>
						<N8nBadge variant="outline" :class="$style.chip" :title="place">{{ place }}</N8nBadge>
					</template>
				</I18nT>
			</N8nText>
			<N8nLink
				v-if="status.showsLink"
				:to="workflowRoute"
				size="small"
				:class="$style.link"
				:aria-label="
					i18n.baseText('instanceAi.automation.resolved.openWorkflowLabel', {
						interpolate: { title: proposal.title },
					})
				"
				data-test-id="automation-proposal-open-workflow"
			>
				{{ i18n.baseText('instanceAi.automation.resolved.openWorkflow') }}
			</N8nLink>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus' as focus;

// The same container as the open card in AutomationProposalCard.vue.
.card {
	--card--padding: var(--spacing--xs) var(--spacing--sm);
	border: 0;
	background-color: var(--color--background--light-3);
	box-shadow: var(--shadow--sm), var(--shadow--outline);

	@include focus.focus-visible-ring;
}

// The link stays at the end of the line; a long sentence wraps beside it.
.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.icon {
	flex-shrink: 0;
	color: var(--icon-color);
}

.status {
	flex: 1;
	min-width: 0;
	margin: 0;
	color: var(--text-color);
	overflow-wrap: anywhere;
}

.success {
	.icon {
		color: var(--icon-color--success);
	}

	.status {
		color: var(--text-color--success);
	}
}

.warning {
	.icon {
		color: var(--icon-color--warning);
	}

	.status {
		color: var(--text-color--warning);
	}
}

// A badge keeps its text on one line. It must shrink in the line to show its ellipsis.
.chip {
	min-width: 0;
	max-width: 100%;
	vertical-align: middle;
}

.link {
	flex-shrink: 0;
	border-radius: var(--radius--sm);

	@include focus.focus-visible-ring-offset;
}
</style>
