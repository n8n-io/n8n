<script lang="ts" setup>
import { computed, ref, useTemplateRef } from 'vue';
import { RouterLink, useRoute, type RouteLocationRaw } from 'vue-router';
import { useResizeObserver } from '@vueuse/core';
import { N8nBadge, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { INSTANCE_AI_THREAD_VIEW, isInstanceAiChatRoute } from '../constants';
import { useInstanceAiAvailable } from '../composables/useInstanceAiAvailability';
import { useWorkflowProvenance } from './useWorkflowProvenance';

const props = defineProps<{
	workflowId: string;
}>();

const i18n = useI18n();
const route = useRoute();
const isAssistantAvailable = useInstanceAiAvailable();
const { provenance } = useWorkflowProvenance(() => props.workflowId, isAssistantAvailable);

// The header also shows in the preview pane of the chat that built the
// workflow. A link to the chat that is already open does nothing useful.
const isInBuildingChat = computed(
	() => isInstanceAiChatRoute(route.name) && route.params.threadId === provenance.value?.threadId,
);

const chatLocation = computed<RouteLocationRaw | null>(() => {
	const record = provenance.value;
	if (!record?.canOpenThread || isInBuildingChat.value) return null;
	return { name: INSTANCE_AI_THREAD_VIEW, params: { threadId: record.threadId } };
});

// A narrow header cuts the text off. The tooltip then gives the full text.
const label = useTemplateRef<HTMLElement>('label');
const isLabelCut = ref(false);
useResizeObserver(label, () => {
	const element = label.value;
	isLabelCut.value = element !== null && element.scrollWidth > element.clientWidth;
});

// The tooltip text goes in the `content` prop, not in the `#content` slot.
// Slot text becomes the link description, and the aria-label already says it.
const linkTooltip = computed(() =>
	i18n.baseText(
		isLabelCut.value ? 'instanceAi.provenance.openChatLabel' : 'instanceAi.provenance.openChat',
	),
);
</script>

<template>
	<N8nTooltip v-if="chatLocation" placement="bottom" as-child :content="linkTooltip">
		<RouterLink
			:to="chatLocation"
			:class="$style.link"
			:aria-label="i18n.baseText('instanceAi.provenance.openChatLabel')"
			data-test-id="workflow-assistant-made-link"
		>
			<N8nBadge variant="outline" leading-icon="sparkles" :class="$style.linkBadge">
				<span :class="$style.labelTrack">
					<span ref="label" :class="$style.labelText">
						{{ i18n.baseText('instanceAi.provenance.badge') }}
					</span>
				</span>
			</N8nBadge>
		</RouterLink>
	</N8nTooltip>
	<N8nTooltip
		v-else-if="provenance"
		placement="bottom"
		as-child
		:content="i18n.baseText('instanceAi.provenance.badge')"
		:disabled="!isLabelCut"
	>
		<N8nBadge
			variant="outline"
			leading-icon="sparkles"
			data-test-id="workflow-assistant-made-badge"
		>
			<span :class="$style.labelTrack">
				<span ref="label" :class="$style.labelText">
					{{ i18n.baseText('instanceAi.provenance.badge') }}
				</span>
			</span>
		</N8nBadge>
	</N8nTooltip>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

.link {
	display: inline-flex;
	border-radius: var(--radius--full);
	color: inherit;
	text-decoration: none;

	&:focus-visible {
		@include focus.focus-ring;
	}
}

.linkBadge {
	cursor: pointer;

	.link:hover & {
		--n8n-badge--background: var(--background--hover);
	}
}

// A `minmax(0, max-content)` track adds no width to the smallest size of the
// badge. So the header can shrink the badge to its icon, and the text gets an
// ellipsis on the way.
.labelTrack {
	display: grid;
	grid-template-columns: minmax(0, max-content);
}

.labelText {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
