import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUIStore } from './ui.store';
import {
	SEVEN_DAYS_IN_MILLIS,
	SIX_MONTHS_IN_MILLIS,
	THREE_DAYS_IN_MILLIS,
	VALUE_SURVEY_MODAL_KEY,
} from '@/constants';
import { valueSurveyIgnored, valueSurveyResponded, valueSurveyShown } from '@/api/valueSurvey';
import { useRootStore } from './n8nRoot.store';
import type { IUserSettings } from 'n8n-workflow';
import { useSettingsStore } from './settings.store';

export const useValueSurvey = defineStore('valueSurvey', () => {
	const shouldShowValueSurveyNext = ref<boolean>(false);

	function setupValueSurveyOnLogin(settings: IUserSettings): void {
		if (!useSettingsStore().isTelemetryEnabled) {
			shouldShowValueSurveyNext.value = false;
			return;
		}

		const userActivated = Boolean(settings.userActivated);
		const userActivatedAt = settings.userActivatedAt;
		const valueSurveyLastShownAt = settings.valueSurveyLastShownAt;
		const valueSurveyLastResponseState = settings.valueSurveyLastResponseState || 'waiting';

		if (!userActivated || !userActivatedAt) {
			return;
		}

		const timeSinceActivation = Date.now() - userActivatedAt;

		if (timeSinceActivation < THREE_DAYS_IN_MILLIS) {
			return;
		}

		if (!valueSurveyLastShownAt) {
			// user has activated but never seen the value survey
			shouldShowValueSurveyNext.value = true;
			return;
		}

		const timeSinceLastShown = Date.now() - valueSurveyLastShownAt;
		if (valueSurveyLastResponseState === 'done' && timeSinceLastShown < SIX_MONTHS_IN_MILLIS) {
			return;
		}
		if (valueSurveyLastResponseState === 'waiting' && timeSinceLastShown < SEVEN_DAYS_IN_MILLIS) {
			return;
		}

		shouldShowValueSurveyNext.value = true;
	}

	function resetValueSurveyOnLogOut() {
		shouldShowValueSurveyNext.value = false;
	}

	function showValueSurveyIfPossible() {
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
		resetValueSurveyOnLogOut,
		showValueSurveyIfPossible,
		ignoreValueSurvey,
		respondValueSurvey,
		setupValueSurveyOnLogin,
	};
});
