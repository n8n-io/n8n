<script setup lang="ts">
import { useAIStore } from '@/stores/ai.store';
import { useI18n } from '@/composables/useI18n';
import { computed } from 'vue';
import { useTelemetry } from '@/composables/useTelemetry';

const aiStore = useAIStore();
const locale = useI18n();
const telemetry = useTelemetry();

const emit = defineEmits<{ (event: 'optionSelected', option: string): void }>();

const aiAssistantChatOpen = computed(() => aiStore.assistantChatOpen);

const title = computed(() => {
	return aiStore.nextStepPopupConfig.title;
});

const options = computed(() => [
	{
		label: locale.baseText('nextStepPopup.option.choose'),
		icon: '➕',
		key: 'choose',
		disabled: false,
	},
	{
		label: locale.baseText('nextStepPopup.option.generate'),
		icon: '✨',
		key: 'generate',
		disabled: aiAssistantChatOpen.value,
	},
]);

const position = computed(() => {
	return [aiStore.nextStepPopupConfig.position[0], aiStore.nextStepPopupConfig.position[1]];
});

const style = computed(() => {
	return {
		left: `${position.value[0]}px`,
		top: `${position.value[1]}px`,
	};
});

const close = () => {
	aiStore.closeNextStepPopup();
};

const onOptionSelected = (option: string) => {
	if (option === 'choose') {
		emit('optionSelected', option);
	} else if (option === 'generate') {
		telemetry.track('User clicked generate AI button', {}, { withPostHog: true });
		aiStore.assistantChatOpen = true;
	}
	close();
};
</script>

<template>
	<div v-on-click-outside="close" :class="$style.container" :style="style">
		<div :class="$style.title">{{ title }}</div>
		<ul :class="$style.options">
			<li
				v-for="option in options"
				:key="option.key"
				:class="{ [$style.option]: true, [$style.disabled]: option.disabled }"
				@click="onOptionSelected(option.key)"
			>
				<div :class="$style.icon">
					{{ option.icon }}
				</div>
				<div :class="$style.label">
					{{ option.label }}
				</div>
			</li>
		</ul>
	</div>
</template>

<style module lang="scss">
.container {
	position: fixed;
	display: flex;
	flex-direction: column;
	min-width: 190px;
	font-size: var(--font-size-2xs);
	background: var(--color-background-xlight);
	filter: drop-shadow(0px 6px 16px #441c170f);
	border: var(--border-width-base) var(--border-style-base) var(--color-foreground-light);
	border-radius: var(--border-radius-base);

	// Arrow border is created as the outer triange
	&:before {
		content: '';
		position: relative;
		left: -11px;
		top: calc(50% - 8px);
		border-top: 10px solid transparent;
		border-bottom: 10px solid transparent;
		border-right: 10px solid var(--color-foreground-light);
		position: absolute;
	}

	// Arrow background is created as the inner triangle
	&:after {
		content: '';
		position: relative;
		left: -10px;
		top: calc(50% - 8px);
		border-top: 10px solid transparent;
		border-bottom: 10px solid transparent;
		border-right: 10px solid var(--color-background-xlight);
		position: absolute;
	}
}

.title {
	padding: var(--spacing-xs);
	color: var(--color-text-base);
	font-weight: var(--font-weight-bold);
}

.options {
	list-style: none;
	display: flex;
	flex-direction: column;
	padding-bottom: var(--spacing-2xs);
}

.option {
	display: flex;
	padding: var(--spacing-3xs) var(--spacing-xs);
	gap: var(--spacing-xs);
	cursor: pointer;
	color: var(--color-text-dark);

	&:hover {
		background: var(--color-background-base);
		font-weight: var(--font-weight-bold);
	}

	&.disabled {
		pointer-events: none;
		color: var(--color-text-light);
	}
}
</style>
