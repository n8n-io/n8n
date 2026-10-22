import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useLocalStorage } from '@vueuse/core';

export interface AgentBuilderLayout {
	chatWidth: 'wide' | 'current';
	testChat: 'inline' | 'dock';
}

// Keep the two choices independent for the width and mode-selector experiments.
export const DEFAULT_AGENT_BUILDER_LAYOUT: AgentBuilderLayout = {
	chatWidth: 'wide',
	testChat: 'inline',
};

export const AGENT_CONFIG_DEFAULT_WIDTH = 440;
export const AGENT_CONFIG_MIN_WIDTH = 360;
export const AGENT_CONFIG_MAX_WIDTH = 720;
const MIN_CHAT_WIDTH = 320;

export function useAgentBuilderLayout(
	containerWidth: MaybeRefOrGetter<number>,
	availableWidth: MaybeRefOrGetter<number> = containerWidth,
) {
	const configWidth = useLocalStorage('N8N_AGENT_BUILDER_CONFIG_WIDTH', AGENT_CONFIG_DEFAULT_WIDTH);
	const compact = computed(() => {
		const width = toValue(availableWidth);
		return width > 0 && width < AGENT_CONFIG_MIN_WIDTH + MIN_CHAT_WIDTH;
	});
	const maxConfigWidth = computed(() =>
		Math.max(
			AGENT_CONFIG_MIN_WIDTH,
			Math.min(AGENT_CONFIG_MAX_WIDTH, toValue(containerWidth) - MIN_CHAT_WIDTH),
		),
	);
	const renderedConfigWidth = computed(() =>
		Math.min(maxConfigWidth.value, Math.max(AGENT_CONFIG_MIN_WIDTH, configWidth.value)),
	);
	const chatWidth = computed(() =>
		compact.value
			? toValue(containerWidth)
			: Math.max(MIN_CHAT_WIDTH, toValue(containerWidth) - renderedConfigWidth.value),
	);
	const defaultChatWidth = computed(() =>
		Math.max(MIN_CHAT_WIDTH, toValue(containerWidth) - AGENT_CONFIG_DEFAULT_WIDTH),
	);
	function resizeChat(width: number) {
		configWidth.value = Math.min(
			maxConfigWidth.value,
			Math.max(AGENT_CONFIG_MIN_WIDTH, toValue(containerWidth) - width),
		);
	}
	return { compact, chatWidth, defaultChatWidth, resizeChat };
}
