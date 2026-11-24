import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useLocalStorage } from '@vueuse/core';

export interface AgentBuilderLayout {
	chatWidth: 'wide' | 'current';
	testChat: 'inline' | 'dock';
}

const DEFAULT_CONFIG_RATIO = 0.35;
export const AGENT_CONFIG_MIN_WIDTH = 360;
const MIN_CHAT_WIDTH = 320;
export const AGENT_BUILDER_COMPACT_WIDTH = AGENT_CONFIG_MIN_WIDTH + MIN_CHAT_WIDTH;

export function useAgentBuilderLayout(
	containerWidth: MaybeRefOrGetter<number>,
	availableWidth: MaybeRefOrGetter<number> = containerWidth,
) {
	const configRatio = useLocalStorage('N8N_AGENT_BUILDER_CONFIG_RATIO', DEFAULT_CONFIG_RATIO);
	const compact = computed(() => {
		const width = toValue(availableWidth);
		return width > 0 && width < AGENT_BUILDER_COMPACT_WIDTH;
	});
	const maxConfigWidth = computed(() =>
		Math.max(AGENT_CONFIG_MIN_WIDTH, toValue(containerWidth) - MIN_CHAT_WIDTH),
	);
	const renderedConfigWidth = computed(() =>
		Math.min(
			maxConfigWidth.value,
			Math.max(AGENT_CONFIG_MIN_WIDTH, toValue(containerWidth) * configRatio.value),
		),
	);
	const chatWidth = computed(() =>
		compact.value
			? toValue(containerWidth)
			: Math.max(MIN_CHAT_WIDTH, toValue(containerWidth) - renderedConfigWidth.value),
	);
	const defaultChatWidth = computed(() =>
		Math.max(
			MIN_CHAT_WIDTH,
			toValue(containerWidth) -
				Math.max(AGENT_CONFIG_MIN_WIDTH, toValue(containerWidth) * DEFAULT_CONFIG_RATIO),
		),
	);
	function resizeChat(width: number) {
		const totalWidth = toValue(containerWidth);
		if (totalWidth <= 0 || compact.value) return;
		// Restore the default ratio even when a minimum panel width limits the reset size.
		configRatio.value =
			Math.abs(width - defaultChatWidth.value) < 1
				? DEFAULT_CONFIG_RATIO
				: Math.min(maxConfigWidth.value, Math.max(AGENT_CONFIG_MIN_WIDTH, totalWidth - width)) /
					totalWidth;
	}
	return { compact, chatWidth, defaultChatWidth, resizeChat };
}
