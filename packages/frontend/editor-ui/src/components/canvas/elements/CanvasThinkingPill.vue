<script setup lang="ts">
import { useCssModule } from 'vue';
import { useI18n } from '@n8n/i18n';
import AssistantIcon from '@n8n/design-system/components/AskAssistantIcon/AssistantIcon.vue';

defineOptions({
	name: 'CanvasThinkingPill',
});

const i18n = useI18n();
const $style = useCssModule();
</script>

<template>
	<div :class="$style.thinkingPill">
		<div :class="$style.iconWrapper">
			<AssistantIcon theme="blank" />
		</div>
		<span :class="$style.text">{{
			i18n.baseText('aiAssistant.builder.canvas.thinking') || 'Thinking...'
		}}</span>
	</div>
</template>

<style lang="scss" module>
.thinkingPill {
	display: flex;
	height: 40px;
	padding: 0 16px 0 14px;
	justify-content: center;
	align-items: center;
	gap: var(--spacing-3xs);
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

.text {
	color: white;
	font-size: 14px;
	font-weight: 500;
	white-space: nowrap;
}
</style>
