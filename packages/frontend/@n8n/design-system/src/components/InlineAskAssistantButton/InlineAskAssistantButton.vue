<script setup lang="ts">
import { computed } from 'vue';

import { useI18n } from '../../composables/useI18n';
import AssistantIcon from '../AskAssistantIcon/AssistantIcon.vue';
import AssistantText from '../AskAssistantText/AssistantText.vue';

const { t } = useI18n();

interface Props {
	size?: 'small' | 'medium';
	static?: boolean;
	asked?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	size: 'medium',
	static: false,
	asked: false,
});

const emit = defineEmits<{
	click: [];
}>();

const sizes = {
	medium: {
		padding: '0px 12px',
		height: '28px',
	},
	small: {
		padding: '0px 6px',
		height: '18px',
	},
};

const hoverable = computed(() => !props.static && !props.asked);

const onClick = () => {
	if (hoverable.value) {
		emit('click');
	}
};
// todo hoverable class not clean below
</script>

<template>
	<button
		:class="{ [$style.button]: true, [$style.hoverable]: hoverable, [$style.asked]: asked }"
		:style="{ height: sizes[size].height }"
		:disabled="asked"
		:tabindex="static ? '-1' : ''"
		data-test-id="ask-assistant-button"
		@click="onClick"
	>
		<div :style="{ padding: sizes[size].padding }">
			<AssistantIcon :size="size" :class="$style.icon" :theme="asked ? 'disabled' : 'default'" />
			<span v-if="asked">{{ t('inlineAskAssistantButton.asked') }}</span>
			<AssistantText v-else :size="size" :text="t('askAssistantButton.askAssistant')" />
		</div>
	</button>
</template>

<style lang="scss" module>
.button {
	border-radius: var(--radius);
	position: relative;
	border: 1px solid transparent;
	padding: 0;
	overflow: hidden;

	background:
		var(--color-askAssistant-button-background-gradient) padding-box,
		var(--color-assistant-highlight-gradient) border-box;

	> div {
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: unset;
	}
}

.hoverable {
	&:hover {
		cursor: pointer;
		background:
			var(--color-askAssistant-button-background-gradient-hover) padding-box,
			var(--color-assistant-highlight-reverse) border-box;

		> div {
			background: var(--color-assistant-inner-highlight-hover);
		}
	}

	&:active {
		background:
			var(--color-askAssistant-button-background-gradient-active) padding-box,
			var(--color-assistant-highlight-reverse) border-box;

		> div {
			background: var(--color-assistant-inner-highlight-active);
		}
	}
}

.asked {
	cursor: not-allowed;
	background: var(--color--foreground);
	color: var(--color--text--tint-1);
}

.icon {
	margin-right: var(--spacing--3xs);
}
</style>
