<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import AiStarsIcon from '@/app/components/AiStarsIcon.vue';

import { N8nTooltip } from '@n8n/design-system';
const i18n = useI18n();

withDefaults(
	defineProps<{
		position?: 'inline' | 'standalone';
	}>(),
	{ position: 'inline' },
);

const emit = defineEmits<{
	click: [];
}>();
</script>

<template>
	<N8nTooltip>
		<template #content>
			<div>{{ i18n.baseText('parameterOverride.applyOverrideButtonTooltip') }}</div>
		</template>

		<div
			:class="[$style.overrideButton, $style[position]]"
			data-test-id="from-ai-override-button"
			@click="emit('click')"
		>
			<AiStarsIcon size="large" />
		</div>
	</N8nTooltip>
</template>

<style lang="scss" module>
.overrideButton {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 30px;
	width: 30px;
	background-color: var(--color--foreground);
	color: var(--color--foreground--shade-2);
	cursor: pointer;
	border: 0;

	&:hover {
		background-color: var(--color--secondary);

		svg {
			// ensure enough contrast in both light and dark mode
			color: var(--color--neutral-250);
		}
	}
}

.inline {
	border-left: 0;
	border-top-right-radius: var(--radius);
	border-bottom-right-radius: var(--radius);
}

.standalone {
	background-color: var(--color--foreground);
	border-top: 0;
	border-top-left-radius: var(--radius);
	border-top-right-radius: var(--radius);
}
</style>
