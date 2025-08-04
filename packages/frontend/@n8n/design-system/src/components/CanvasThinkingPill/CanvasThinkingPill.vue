<script setup lang="ts">
import { useCssModule } from 'vue';

import { useI18n } from '../../composables/useI18n';
import AssistantIcon from '../AskAssistantIcon/AssistantIcon.vue';
import N8nButton from '../N8nButton';

defineOptions({
	name: 'CanvasThinkingPill',
});

defineProps<{
	showStop?: boolean;
}>();

const emit = defineEmits<{
	stop: [];
}>();

const { t } = useI18n();
const $style = useCssModule();
</script>

<template>
	<div :class="$style.thinkingPill">
		<div :class="$style.iconWrapper">
			<AssistantIcon theme="blank" />
		</div>
		<span :class="$style.text"
			>{{ t('aiAssistant.builder.canvas.thinking') }}
			<N8nButton
				v-if="showStop"
				:class="$style.stopButton"
				:label="'Stop'"
				type="secondary"
				size="mini"
				@click="emit('stop')"
			/>
		</span>
	</div>
</template>

<style lang="scss" module>
.thinkingPill {
	display: flex;
	height: 40px;
	padding: 0 var(--spacing-s) 0 var(--spacing-xs);
	justify-content: center;
	align-items: center;
	gap: var(--spacing-2xs);
	border-radius: 22px;
	border: 1px solid var(--prim-gray-740);
	background: rgba(65, 66, 68, 0.92);
	cursor: default;

	// Disable text selection
	-moz-user-select: none;
	-webkit-user-select: none;
	user-select: none;
}

.iconWrapper {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: radial-gradient(83.1% 83.1% at 30% 30%, #7a6bea 0%, #d57bae 100%);

	display: flex;
	align-items: center;
	justify-content: center;
}

.stopButton {
	margin-left: var(--spacing-xs);
}
.text {
	color: white;
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-medium);
	white-space: nowrap;
}
</style>
