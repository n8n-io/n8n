<script setup lang="ts">
import { computed } from 'vue';
import AssistantIcon from '../AskAssistantIcon/AssistantIcon.vue';
import AssistantText from '../AskAssistantText/AssistantText.vue';
import { useI18n } from '../../composables/useI18n';

const { t } = useI18n();

interface Props {
	size: 'small' | 'medium';
	static: boolean;
	asked: boolean;
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
		padding: '0px 3px',
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
		@click="onClick"
	>
		<div>
			<div :style="{ padding: sizes[size].padding }">
				<AssistantIcon :size="size" :class="$style.icon" />
				<span v-if="asked">{{ t('inlineAskAssistantButton.asked') }}</span>
				<AssistantText v-else :size="size" :text="t('inlineAskAssistantButton.askAssistant')" />
			</div>
		</div>
	</button>
</template>

<style lang="scss" module>
// todo use tokens for colors and stuff
// todo localization?
// todo svg? reuse?
.button {
	$border: 1px;
	border-radius: 4px;
	position: relative;
	border: 0;
	padding: 1px;

	background: var(--color-assistant-highlight-gradient);

	> div {
		background: var(--color-background-xlight);
		border-radius: inherit;
		height: 100%;

		> div {
			height: 100%;
			display: flex;
			align-items: center;
			justify-content: center;
			line-height: unset;
		}
	}
}

.hoverable {
	&:hover {
		cursor: pointer;
		background: var(--color-assistant-highlight-reverse);

		> div > div {
			background: linear-gradient(
				108.82deg,
				rgba(236, 123, 142, 0.12) 0%,
				rgba(170, 123, 236, 0.12) 50.5%,
				rgba(91, 96, 232, 0.12) 100%
			);
		}
	}

	&:active {
		background: var(--color-assistant-highlight-gradient);
		> div > div {
			background: linear-gradient(
				108.82deg,
				rgba(236, 123, 142, 0.25) 0%,
				rgba(170, 123, 236, 0.25) 50.5%,
				rgba(91, 96, 232, 0.25) 100%
			);
		}
	}
}

.asked {
	cursor: not-allowed;
	background: var(--color-foreground-base);
	color: var(--color-text-light);
}

.icon {
	margin-right: 6px;
	margin-bottom: -1px; // center icon to align with text
}
</style>
