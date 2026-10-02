<script setup lang="ts">
import { N8nButton, N8nTooltip, TOOLTIP_DELAY_MS } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{ title?: string }>();
const i18n = useI18n();
const label = computed(() => props.title || i18n.baseText('instanceAi.sidebar.chatHistory'));
</script>

<template>
	<N8nTooltip
		as-child
		:content="i18n.baseText('instanceAi.sidebar.chatHistory')"
		:disabled="!props.title"
		placement="bottom"
		:show-after="TOOLTIP_DELAY_MS"
	>
		<N8nButton
			v-bind="$attrs"
			variant="ghost"
			size="small"
			icon="history"
			icon-size="large"
			:class="$style.button"
			:aria-label="label"
		>
			<span :class="$style.label" :title="props.title">
				{{ label }}
			</span>
		</N8nButton>
	</N8nTooltip>
</template>

<style lang="scss" module>
.button {
	min-width: 0;
	max-width: 100%;
	padding-inline: calc((var(--height--sm) - var(--font-size--md)) / 2);

	> div {
		min-width: 0;
	}

	svg {
		flex-shrink: 0;
	}
}

.label {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
