<script lang="ts" setup>
import { N8nBadge, N8nButton, N8nCard, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useElementHover } from '@vueuse/core';
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed, useTemplateRef } from 'vue';
import { useToolLabel } from '../toolLabels';

const props = defineProps<{
	args: Record<string, unknown>;
	result?: unknown;
	isLoading: boolean;
	toolCallId?: string;
}>();

const i18n = useI18n();
const { getToolLabel } = useToolLabel();

const role = computed(() => {
	return typeof props.args.role === 'string' ? props.args.role : '';
});

const tools = computed((): string[] => {
	if (!Array.isArray(props.args.tools)) return [];
	return props.args.tools.every((item) => typeof item === 'string') ? props.args.tools : [];
});

const briefing = computed(() => {
	return typeof props.args.briefing === 'string' ? props.args.briefing : '';
});

const triggerRef = useTemplateRef<HTMLElement>('triggerRef');
const isHovered = useElementHover(triggerRef);
</script>

<template>
	<CollapsibleRoot v-slot="{ open: isOpen }">
		<CollapsibleTrigger as-child>
			<N8nButton ref="triggerRef" variant="ghost" :class="$style.trigger">
				<template #icon>
					<template v-if="isHovered">
						<N8nIcon :icon="isOpen ? 'minus' : 'plus'" size="small" />
					</template>
					<template v-else>
						<N8nIcon v-if="props.isLoading" icon="spinner" color="primary" spin size="small" />
						<N8nIcon v-else icon="check" color="success" :class="$style.successIcon" size="small" />
					</template>
				</template>
				{{ i18n.baseText('instanceAi.delegateCard.delegatingTo') }}:
				<N8nText bold>{{ role }}</N8nText>
			</N8nButton>
		</CollapsibleTrigger>
		<CollapsibleContent>
			<N8nCard>
				<N8nText bold>{{ i18n.baseText('instanceAi.delegateCard.tools') }}</N8nText>
				<div v-if="tools.length" :class="$style.toolsRow">
					<N8nBadge v-for="tool in tools" :key="tool">{{ getToolLabel(tool) }}</N8nBadge>
				</div>
				<N8nText tag="div">{{ briefing }}</N8nText>
			</N8nCard>
		</CollapsibleContent>
	</CollapsibleRoot>
	<!-- Result is intentionally NOT shown here.
			 The sub-agent's full activity (tool calls + text) is rendered by
			 AgentNodeSection which follows this card in the timeline. -->
</template>

<style lang="scss" module>
.trigger {
	width: 100%;
	justify-content: flex-start;
}
</style>
