import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';

/** Step labels for the setup wizard; the optional search step drops off when already configured. */
export function useInstanceAiSetupSteps(step: number) {
	const i18n = useI18n();
	const store = useInstanceAiSettingsStore();

	const totalSteps = computed(() =>
		(store.settings?.searchCredentialId ?? store.settings?.searchEnvConfigured) ? 2 : 3,
	);
	const stepLabel = computed(() =>
		i18n.baseText('settings.n8nAgent.setup.step', {
			interpolate: { step, total: totalSteps.value },
		}),
	);
	const isLastStep = computed(() => step >= totalSteps.value);

	return { stepLabel, isLastStep };
}
