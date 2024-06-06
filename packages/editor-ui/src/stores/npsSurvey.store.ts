import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUIStore } from './ui.store';
import {
	SEVEN_DAYS_IN_MILLIS,
	SIX_MONTHS_IN_MILLIS,
	THREE_DAYS_IN_MILLIS,
	VALUE_SURVEY_MODAL_KEY,
} from '@/constants';
import { npsSurveyIgnored, npsSurveyResponded, npsSurveyShown } from '@/api/npsSurvey';
import { useRootStore } from './n8nRoot.store';
import type { IUserSettings } from 'n8n-workflow';
import { useSettingsStore } from './settings.store';

export const MAXIMUM_TIMES_TO_SHOW_SURVEY_IF_IGNORED = 3;

export const useNpsSurvey = defineStore('npsSurvey', () => {
	const shouldShowNpsSurveyNext = ref<boolean>(false);
	const npsSurveyIgnoredCount = ref<number>(0);

	function setupNpsSurveyOnLogin(settings: IUserSettings): void {
		if (!useSettingsStore().isTelemetryEnabled) {
			shouldShowNpsSurveyNext.value = false;
			return;
		}

		const userActivated = Boolean(settings.userActivated);
		const userActivatedAt = settings.userActivatedAt;
		const npsSurveyLastShownAt = settings.npsSurveyLastShownAt;
		const npsSurveyLastResponseState = settings.npsSurveyLastResponseState || 'waiting';
		npsSurveyIgnoredCount.value = settings.npsSurveyIgnoredLastCount ?? 0;

		if (!userActivated || !userActivatedAt) {
			return;
		}

		const timeSinceActivation = Date.now() - userActivatedAt;

		if (timeSinceActivation < THREE_DAYS_IN_MILLIS) {
			return;
		}

		if (!npsSurveyLastShownAt) {
			// user has activated but never seen the nps survey
			shouldShowNpsSurveyNext.value = true;
			return;
		}

		const timeSinceLastShown = Date.now() - npsSurveyLastShownAt;
		if (npsSurveyLastResponseState === 'done' && timeSinceLastShown < SIX_MONTHS_IN_MILLIS) {
			return;
		}
		if (npsSurveyLastResponseState === 'waiting' && timeSinceLastShown < SEVEN_DAYS_IN_MILLIS) {
			return;
		}

		shouldShowNpsSurveyNext.value = true;
	}

	function resetNpsSurveyOnLogOut() {
		shouldShowNpsSurveyNext.value = false;
	}

	function showNpsSurveyIfPossible() {
		if (!shouldShowNpsSurveyNext.value) {
			return;
		}

		useUIStore().openModal(VALUE_SURVEY_MODAL_KEY);
		shouldShowNpsSurveyNext.value = false;

		void npsSurveyShown(useRootStore().getRestApiContext);
	}

	function respondNpsSurvey() {
		void npsSurveyResponded(useRootStore().getRestApiContext);
	}

	function ignoreNpsSurvey() {
		if (npsSurveyIgnoredCount.value + 1 >= MAXIMUM_TIMES_TO_SHOW_SURVEY_IF_IGNORED) {
			respondNpsSurvey();

			return;
		}
		void npsSurveyIgnored(useRootStore().getRestApiContext);
	}
	return {
		resetNpsSurveyOnLogOut,
		showNpsSurveyIfPossible,
		ignoreNpsSurvey,
		respondNpsSurvey,
		setupNpsSurveyOnLogin,
	};
});
