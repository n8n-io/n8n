import { computed, ref, type Ref } from 'vue';

export type InstanceAiOnboardingStep = 'model' | 'sandbox' | 'search' | 'done';

export interface InstanceAiOnboardingConfiguration {
	modelConfigured: Ref<boolean>;
	sandboxConfigured: Ref<boolean>;
	searchDecided: Ref<boolean>;
	searchEnvConfigured: Ref<boolean>;
}

export function useInstanceAiOnboarding(configuration: InstanceAiOnboardingConfiguration) {
	const open = ref(false);
	const step = ref<InstanceAiOnboardingStep>('model');
	const editMode = ref(false);

	const sequence = computed<InstanceAiOnboardingStep[]>(() => [
		'model',
		...(configuration.sandboxConfigured.value ? [] : (['sandbox'] as const)),
		...(configuration.searchEnvConfigured.value ? [] : (['search'] as const)),
		'done',
	]);

	function firstUnmetStep(): InstanceAiOnboardingStep {
		if (!configuration.modelConfigured.value) return 'model';
		if (!configuration.sandboxConfigured.value) return 'sandbox';
		if (!configuration.searchDecided.value && !configuration.searchEnvConfigured.value) {
			return 'search';
		}
		return 'done';
	}

	function start(target = firstUnmetStep(), editing = false): void {
		step.value = target;
		editMode.value = editing;
		open.value = true;
	}

	function close(): void {
		open.value = false;
		editMode.value = false;
	}

	function advance(): void {
		if (editMode.value) {
			editMode.value = false;
			const nextStep = firstUnmetStep();
			if (nextStep === 'done') {
				step.value = nextStep;
			} else {
				open.value = false;
			}
			return;
		}
		step.value = firstUnmetStep();
	}

	function back(): void {
		if (editMode.value) {
			step.value = 'done';
			editMode.value = false;
			return;
		}
		const index = sequence.value.indexOf(step.value);
		step.value = sequence.value[Math.max(0, index - 1)] ?? 'model';
	}

	return { open, step, editMode, sequence, firstUnmetStep, start, close, advance, back };
}
