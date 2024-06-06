import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUIStore } from './ui.store';
import {
	SEVEN_DAYS_IN_MILLIS,
	SIX_MONTHS_IN_MILLIS,
	THREE_DAYS_IN_MILLIS,
	NPS_SURVEY_MODAL_KEY,
} from '@/constants';
import { useRootStore } from './n8nRoot.store';
import type { IUserSettings, NpsSurveyState } from 'n8n-workflow';
import { useSettingsStore } from './settings.store';
import { updateNpsSurveyState } from '@/api/npsSurvey';

export const MAXIMUM_TIMES_TO_SHOW_SURVEY_IF_IGNORED = 3;

export const useNpsSurvey = defineStore('npsSurvey', () => {
	const shouldShowNpsSurveyNext = ref<boolean>(false);
	const currentSurveyState = ref<NpsSurveyState | undefined>();

	function setupNpsSurveyOnLogin(settings: IUserSettings): void {
		if (!useSettingsStore().isTelemetryEnabled) {
			shouldShowNpsSurveyNext.value = false;
			return;
		}

		currentSurveyState.value = settings.npsSurvey;
		const userActivated = Boolean(settings.userActivated);
		const userActivatedAt = settings.userActivatedAt;
		const lastShownAt = currentSurveyState.value?.lastShownAt;

		if (!userActivated || !userActivatedAt) {
			return;
		}

		const timeSinceActivation = Date.now() - userActivatedAt;
		if (timeSinceActivation < THREE_DAYS_IN_MILLIS) {
			return;
		}

		if (!currentSurveyState.value || !lastShownAt) {
			// user has activated but never seen the nps survey
			shouldShowNpsSurveyNext.value = true;
			return;
		}

		const timeSinceLastShown = Date.now() - lastShownAt;
		if ('responded' in currentSurveyState.value && timeSinceLastShown < SIX_MONTHS_IN_MILLIS) {
			return;
		}
		if (
			'waitingForResponse' in currentSurveyState.value &&
			timeSinceLastShown < SEVEN_DAYS_IN_MILLIS
		) {
			return;
		}

		shouldShowNpsSurveyNext.value = true;
	}

	function resetNpsSurveyOnLogOut() {
		shouldShowNpsSurveyNext.value = false;
	}

	async function showNpsSurveyIfPossible() {
		if (!shouldShowNpsSurveyNext.value) {
			return;
		}

		useUIStore().openModal(NPS_SURVEY_MODAL_KEY);
		shouldShowNpsSurveyNext.value = false;

		const updatedState: NpsSurveyState = {
			waitingForResponse: true,
			lastShownAt: Date.now(),
			ignoredCount: 0,
		};
		await updateNpsSurveyState(useRootStore().getRestApiContext, updatedState);
		currentSurveyState.value = updatedState;
	}

	async function respondNpsSurvey() {
		if (!currentSurveyState.value) {
			return;
		}

		const updatedState: NpsSurveyState = {
			responded: true,
			lastShownAt: currentSurveyState.value.lastShownAt,
		};
		await updateNpsSurveyState(useRootStore().getRestApiContext, updatedState);
		currentSurveyState.value = updatedState;
	}

	async function ignoreNpsSurvey() {
		if (!currentSurveyState.value) {
			return;
		}
		const state = currentSurveyState.value;
		const ignoredCount = 'ignoredCount' in state ? state.ignoredCount : 0;

		if (ignoredCount + 1 >= MAXIMUM_TIMES_TO_SHOW_SURVEY_IF_IGNORED) {
			await respondNpsSurvey();

			return;
		}

		const updatedState: NpsSurveyState = {
			waitingForResponse: true,
			lastShownAt: currentSurveyState.value.lastShownAt,
			ignoredCount: ignoredCount + 1,
		};
		await updateNpsSurveyState(useRootStore().getRestApiContext, updatedState);
		currentSurveyState.value = updatedState;
	}

	return {
		resetNpsSurveyOnLogOut,
		showNpsSurveyIfPossible,
		ignoreNpsSurvey,
		respondNpsSurvey,
		setupNpsSurveyOnLogin,
	};
});
