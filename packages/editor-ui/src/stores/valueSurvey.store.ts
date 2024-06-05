import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUIStore } from './ui.store';
import { VALUE_SURVEY_MODAL_KEY } from '@/constants';
import { valueSurveyIgnored, valueSurveyResponded, valueSurveyShown } from '@/api/valueSurvey';
import { useRootStore } from './n8nRoot.store';
import type { IUserSettings } from 'n8n-workflow';
import { useSettingsStore } from './settings.store';

export const useValueSurvey = defineStore('valueSurvey', () => {
	const shouldShowValueSurveyNext = ref<boolean>(false);
	const valueSurveyIgnoredLastCount = ref<number | undefined>();

	function setupValueSurveyOnLogin(settings: IUserSettings): void {
		if (!useSettingsStore().isTelemetryEnabled) {
			shouldShowValueSurveyNext.value = false;
			return;
		}

		const ONE_DAY_IN_MILLIS = 24 * 60 * 60 * 1000;
		const THREE_DAYS_IN_MILLIS = 3 * ONE_DAY_IN_MILLIS;
		const SEVEN_DAYS_IN_MILLIS = 7 * ONE_DAY_IN_MILLIS;
		const SIX_MONTHS_IN_MILLIS = 6 * 30 * ONE_DAY_IN_MILLIS;

		const userActivated = Boolean(settings.userActivated);
		const userActivatedAt = settings.userActivatedAt;
		const valueSurveyLastShownAt = settings.valueSurveyLastShownAt;
		const valueSurveyIgnoredCount = settings.valueSurveyIgnoredLastCount ?? 0;

		if (!userActivated || !userActivatedAt) {
			return;
		}

		const timeSinceActivation = Date.now() - userActivatedAt;
		if (userActivated && timeSinceActivation < THREE_DAYS_IN_MILLIS) {
			return;
		}

		if (!valueSurveyLastShownAt) {
			// user has activated but never seen the value survey
			shouldShowValueSurveyNext.value = true;
			return;
		}

		const timeSinceLastShown = Date.now() - valueSurveyLastShownAt;
		if (valueSurveyIgnoredCount === 0 && timeSinceLastShown < SIX_MONTHS_IN_MILLIS) {
			return;
		}
		if (valueSurveyIgnoredCount > 0 && timeSinceLastShown < SEVEN_DAYS_IN_MILLIS) {
			return;
		}
		if (valueSurveyIgnoredCount >= 3) {
			return;
		}

		shouldShowValueSurveyNext.value = true;
	}

	function resetValueSurveyOnLogOut() {
		shouldShowValueSurveyNext.value = false;
		valueSurveyIgnoredLastCount.value = undefined;
	}

	function showValueSurvey() {
		if (!shouldShowValueSurveyNext.value) {
			return;
		}

		useUIStore().openModal(VALUE_SURVEY_MODAL_KEY);
		shouldShowValueSurveyNext.value = false;

		void valueSurveyShown(useRootStore().getRestApiContext);
	}

	function ignoreValueSurvey() {
		void valueSurveyIgnored(useRootStore().getRestApiContext);
	}

	function respondValueSurvey() {
		void valueSurveyResponded(useRootStore().getRestApiContext);
	}

	return {
		shouldShowValueSurveyNext,
		resetValueSurveyOnLogOut,
		showValueSurvey,
		ignoreValueSurvey,
		respondValueSurvey,
		setupValueSurveyOnLogin,
	};
});
