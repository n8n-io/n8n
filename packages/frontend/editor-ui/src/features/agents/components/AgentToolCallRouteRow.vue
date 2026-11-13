<script setup lang="ts">
import {
	N8nAiActivityStepButton,
	N8nAiActivityStepChevron,
	N8nAnimatedCollapsibleContent,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed, ref, useId } from 'vue';

import type { AgentToolCallRouteItem } from '../toolCallSimulation.types';
import {
	getToolCallBlockedNextStepKey,
	getToolCallReasonKey,
	getToolCallRouteDisplay,
} from '../utils/toolCallSimulation';
import AgentToolCallRouteIcon from './AgentToolCallRouteIcon.vue';

/**
 * One tool call of a test run. Collapsed, it shows the tool name and an icon for how
 * the call ran. Expanded, it explains why, and what to do next when the call was blocked.
 * Calls without a known route are not expandable.
 */
const props = defineProps<{
	call: AgentToolCallRouteItem;
}>();

const i18n = useI18n();

const isOpen = ref(false);
/** Reka only knows the content id after the trigger renders, so the row sets its own. */
const detailsId = useId();

const simulation = computed(() => props.call.simulation);
const display = computed(() =>
	simulation.value ? getToolCallRouteDisplay(simulation.value.route) : undefined,
);
const canExpand = computed(() => display.value !== undefined);

const routeLabel = computed(() => (display.value ? i18n.baseText(display.value.labelKey) : ''));

const reasonText = computed(() => {
	const key = simulation.value ? getToolCallReasonKey(simulation.value.reason) : undefined;
	return key ? i18n.baseText(key) : '';
});

const detail = computed(() => simulation.value?.detail?.trim() ?? '');

const nextStep = computed(() =>
	simulation.value?.route === 'blocked'
		? i18n.baseText(getToolCallBlockedNextStepKey(simulation.value.reason))
		: '',
);
</script>

<template>
	<div
		:class="$style.row"
		:data-tool-call-id="call.toolCallId"
		:data-route="canExpand ? simulation?.route : undefined"
		data-test-id="agent-tool-call-route-row"
	>
		<!-- Keep the closed details in the DOM, hidden, so aria-controls always resolves. -->
		<CollapsibleRoot v-if="canExpand && simulation" v-model:open="isOpen" :unmount-on-hide="false">
			<CollapsibleTrigger as-child>
				<N8nAiActivityStepButton
					:class="$style.header"
					size="small"
					full-width
					:aria-controls="detailsId"
					data-test-id="agent-tool-call-route-toggle"
				>
					<span :class="$style.nameWithChevron">
						<span
							:class="$style.name"
							:title="call.toolName"
							data-test-id="agent-tool-call-route-tool-name"
						>
							{{ call.toolName }}
						</span>
						<N8nAiActivityStepChevron :open="isOpen" />
					</span>
					<template #suffix>
						<AgentToolCallRouteIcon :route="simulation.route" />
					</template>
				</N8nAiActivityStepButton>
			</CollapsibleTrigger>
			<N8nAnimatedCollapsibleContent>
				<div
					:id="detailsId"
					:class="$style.details"
					:data-reason="simulation.reason"
					data-test-id="agent-tool-call-route-details"
				>
					<N8nText size="small" bold data-test-id="agent-tool-call-route-details-label">
						{{ routeLabel }}
					</N8nText>
					<N8nText
						v-if="reasonText"
						size="small"
						color="text-base"
						data-test-id="agent-tool-call-route-reason"
					>
						{{ reasonText }}
					</N8nText>
					<N8nText
						v-if="detail"
						size="small"
						color="text-light"
						:class="$style.detail"
						data-test-id="agent-tool-call-route-detail"
					>
						{{ detail }}
					</N8nText>
					<N8nText
						v-if="nextStep"
						size="small"
						color="text-dark"
						:class="$style.nextStep"
						data-test-id="agent-tool-call-route-next-step"
					>
						{{ nextStep }}
					</N8nText>
				</div>
			</N8nAnimatedCollapsibleContent>
		</CollapsibleRoot>
		<div v-else :class="[$style.header, $style.static]">
			<span
				:class="$style.name"
				:title="call.toolName"
				data-test-id="agent-tool-call-route-tool-name"
			>
				{{ call.toolName }}
			</span>
		</div>
	</div>
</template>

<style module>
.row {
	min-width: 0;

	--ai-activity-step--color: var(--text-color--subtle);
}

.header {
	--ai-activity-step--padding: var(--spacing--4xs) var(--spacing--2xs);
	--ai-activity-step--height: auto;
	--button--color--background-hover: var(--background--hover);
	/* Keep the open row quiet: the rail below already ties the details to it. */
	--button--color--background-active: var(--background--hover);

	gap: var(--spacing--2xs);
}

.static {
	display: flex;
	align-items: center;
	min-width: 0;
	min-height: calc(var(--height--2xs) + 2 * var(--spacing--4xs));
	padding: var(--spacing--4xs) var(--spacing--2xs);
	font-size: var(--font-size--xs);
	color: var(--text-color--subtle);
}

.nameWithChevron {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.name {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* Rail under the row, as in the session timeline. */
.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: var(--spacing--4xs) 0 var(--spacing--2xs) var(--spacing--sm);
	padding: var(--spacing--4xs) var(--spacing--sm);
	border-left: var(--border);
	min-width: 0;
}

.detail {
	overflow-wrap: anywhere;
}

.nextStep {
	margin-top: var(--spacing--4xs);
}
</style>
