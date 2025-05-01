<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { useStyles } from '@/composables/useStyles';
import { N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { computed } from 'vue';

const { isOpen, showToggleButton, showPopOutButton } = defineProps<{
	isOpen: boolean;
	showToggleButton: boolean;
	showPopOutButton: boolean;
}>();

const emit = defineEmits<{ popOut: []; toggleOpen: [] }>();

const appStyles = useStyles();
const locales = useI18n();
const tooltipZIndex = computed(() => appStyles.APP_Z_INDEXES.ASK_ASSISTANT_FLOATING_BUTTON + 100);
const popOutButtonText = computed(() => locales.baseText('runData.panel.actions.popOut'));
const toggleButtonText = computed(() =>
	locales.baseText(isOpen ? 'runData.panel.actions.collapse' : 'runData.panel.actions.open'),
);
</script>

<template>
	<div :class="$style.container">
		<N8nTooltip v-if="showPopOutButton" :z-index="tooltipZIndex" :content="popOutButtonText">
			<N8nIconButton
				icon="pop-out"
				type="secondary"
				size="small"
				icon-size="medium"
				:aria-label="popOutButtonText"
				@click.stop="emit('popOut')"
			/>
		</N8nTooltip>
		<N8nTooltip v-if="showToggleButton" :z-index="tooltipZIndex" :content="toggleButtonText">
			<N8nIconButton
				type="secondary"
				size="small"
				icon-size="medium"
				:icon="isOpen ? 'chevron-down' : 'chevron-up'"
				:aria-label="toggleButtonText"
				style="color: var(--color-text-base)"
				@click.stop="emit('toggleOpen')"
			/>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
}

.container button {
	border: none;
	color: var(--color-text-light);
}
</style>
