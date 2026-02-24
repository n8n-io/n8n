<script setup lang="ts">
import { type AgentIconOrEmoji } from '@n8n/api-types';
import { N8nButton, type IconName } from '@n8n/design-system';

defineProps<{
	prompts: Array<{ text: string; icon?: AgentIconOrEmoji }>;
}>();

const emit = defineEmits<{
	select: [prompt: string];
}>();

function getIconName(icon?: AgentIconOrEmoji): IconName | undefined {
	return icon?.type === 'icon' ? (icon.value as IconName) : undefined;
}
</script>

<template>
	<div :class="$style.container">
		<N8nButton
			v-for="prompt in prompts"
			:key="prompt.text"
			variant="outline"
			size="small"
			:icon="getIconName(prompt.icon)"
			:class="$style.chip"
			@click="emit('select', prompt.text)"
		>
			<template v-if="prompt.icon?.type === 'emoji'" #icon>
				<span :class="$style.emoji">{{ prompt.icon.value }}</span>
			</template>
			{{ prompt.text }}
		</N8nButton>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
	justify-content: center;
}

.chip {
	border-radius: 999px;
	padding-right: var(--spacing--sm);
	font-weight: 500;
	gap: var(--spacing--3xs);
}

.emoji {
	font-size: var(--font-size--sm);
	line-height: 1;
}
</style>
