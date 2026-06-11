<script setup lang="ts">
import { useCssModule } from 'vue';

import { useI18n } from '../../composables/useI18n';
import AssistantIcon from '../AskAssistantIcon/AssistantIcon.vue';
import N8nCanvasPill from '../CanvasPill';
import N8nButton from '../N8nButton';

defineOptions({
	name: 'N8nCanvasThinkingPill',
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
	<N8nCanvasPill>
		<template #icon>
			<div :class="$style.iconWrapper">
				<AssistantIcon theme="blank" />
			</div>
		</template>
		<div :class="$style.wrapper">
			{{ t('aiAssistant.builder.canvas.thinking') }}
			<N8nButton
				v-if="showStop"
				:class="$style.stopButton"
				:label="'Stop'"
				variant="ghost"
				size="xsmall"
				@click="emit('stop')"
			/>
		</div>
	</N8nCanvasPill>
</template>

<style lang="scss" module>
.iconWrapper {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: radial-gradient(83.1% 83.1% at 30% 30%, #7a6bea 0%, #d57bae 100%);

	display: flex;
	align-items: center;
	justify-content: center;
}

.wrapper {
	display: flex;
	align-items: center;
}

.stopButton {
	margin-left: var(--spacing--xs);
	margin-right: calc(var(--spacing--2xs) * -1);
	color: var(--color--neutral-white);
}
</style>
