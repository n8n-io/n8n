<script setup lang="ts">
import { N8nButton, N8nTooltip, TOOLTIP_DELAY_MS } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{ showLabel?: boolean }>(), { showLabel: true });
const i18n = useI18n();
</script>

<template>
	<N8nTooltip
		as-child
		:content="i18n.baseText('instanceAi.sidebar.chatHistory')"
		:disabled="props.showLabel"
		placement="bottom"
		:show-after="TOOLTIP_DELAY_MS"
	>
		<N8nButton
			v-bind="$attrs"
			variant="ghost"
			size="small"
			icon="history"
			icon-size="large"
			:icon-only="!props.showLabel"
			:class="$style.button"
			:aria-label="i18n.baseText('instanceAi.sidebar.chatHistory')"
		>
			<span v-if="props.showLabel" :class="$style.label">
				{{ i18n.baseText('instanceAi.sidebar.chatHistory') }}
			</span>
		</N8nButton>
	</N8nTooltip>
</template>

<style lang="scss" module>
.button {
	padding-inline: calc((var(--height--sm) - var(--font-size--md)) / 2);
}

.label {
	// Keep long translations from crowding the session title.
	max-width: var(--spacing--4xl);
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
