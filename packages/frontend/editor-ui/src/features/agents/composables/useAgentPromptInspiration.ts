import { onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useDocumentVisibility, usePreferredReducedMotion } from '@vueuse/core';
import { AGENT_PROMPT_INSPIRATION_TIMING } from '@/app/constants/durations';

export function useAgentPromptInspiration(options: {
	prompts: MaybeRefOrGetter<readonly string[]>;
	enabled: MaybeRefOrGetter<boolean>;
}) {
	const placeholder = ref<string>();
	const visibility = useDocumentVisibility();
	const reducedMotion = usePreferredReducedMotion();
	let timer: ReturnType<typeof setTimeout> | undefined;

	function clearTimer() {
		clearTimeout(timer);
		timer = undefined;
	}

	watch(
		[() => toValue(options.enabled), () => toValue(options.prompts), visibility, reducedMotion],
		([enabled, prompts, visible, motion]) => {
			clearTimer();
			placeholder.value = undefined;
			const examples = prompts.filter((prompt) => prompt.length > 0).map((prompt) => [...prompt]);
			const first = examples[0];
			if (!enabled || !first) return;
			if (motion === 'reduce') {
				placeholder.value = first.join('');
				return;
			}
			if (visible !== 'visible') return;

			let index = 0;
			let length = 0;
			let erasing = false;
			placeholder.value = '';

			function tick() {
				const prompt = examples[index];
				length += erasing ? -1 : 1;
				placeholder.value = prompt.slice(0, length).join('');
				let delay: number = erasing
					? AGENT_PROMPT_INSPIRATION_TIMING.ERASE
					: AGENT_PROMPT_INSPIRATION_TIMING.TYPE;
				if (!erasing && length === prompt.length) {
					erasing = true;
					delay = AGENT_PROMPT_INSPIRATION_TIMING.HOLD;
				} else if (erasing && length === 0) {
					erasing = false;
					index = (index + 1) % examples.length;
					delay = AGENT_PROMPT_INSPIRATION_TIMING.TYPE;
				}
				timer = setTimeout(tick, delay);
			}

			timer = setTimeout(tick, AGENT_PROMPT_INSPIRATION_TIMING.TYPE);
		},
		{ immediate: true },
	);

	onScopeDispose(clearTimer);
	return placeholder;
}
