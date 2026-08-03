import { useTelemetry } from '@n8n/composables/useTelemetry';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { useInstanceAiAvailable } from '../composables/useInstanceAiAvailability';

/** Interactions that can surface the "Try AI Assistant" nudge. */
export const INSTANCE_AI_NUDGE_TRIGGERS = ['workflow_created'] as const;
export type InstanceAiNudgeTrigger = (typeof INSTANCE_AI_NUDGE_TRIGGERS)[number];

/** Delay between the triggering interaction and the nudge appearing. */
export const INSTANCE_AI_NUDGE_SHOW_DELAY_MS = 2000;

export const useInstanceAiNudgeStore = defineStore('instanceAiNudge', () => {
	const isInstanceAiAvailable = useInstanceAiAvailable();
	const telemetry = useTelemetry();

	const activeTrigger = ref<InstanceAiNudgeTrigger | null>(null);
	// Session-only by design: dismissals reset on reload so the nudge can resurface.
	const dismissedTriggers = ref(new Set<InstanceAiNudgeTrigger>());

	let pendingTrigger: InstanceAiNudgeTrigger | null = null;
	let showTimeout: ReturnType<typeof setTimeout> | undefined;

	function showNudge(trigger: InstanceAiNudgeTrigger) {
		if (
			!isInstanceAiAvailable.value ||
			dismissedTriggers.value.has(trigger) ||
			activeTrigger.value === trigger ||
			pendingTrigger === trigger
		) {
			return;
		}
		clearTimeout(showTimeout);
		pendingTrigger = trigger;
		showTimeout = setTimeout(() => {
			pendingTrigger = null;
			activeTrigger.value = trigger;
			telemetry.track('Instance AI nudge shown', { trigger });
		}, INSTANCE_AI_NUDGE_SHOW_DELAY_MS);
	}

	function dismissNudge() {
		if (!activeTrigger.value) return;
		dismissedTriggers.value.add(activeTrigger.value);
		activeTrigger.value = null;
	}

	return {
		activeTrigger,
		dismissedTriggers,
		showNudge,
		dismissNudge,
	};
});
