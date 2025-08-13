import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUIStore } from './ui.store';
import {
	SEVEN_DAYS_IN_MILLIS,
	SIX_MONTHS_IN_MILLIS,
	THREE_DAYS_IN_MILLIS,
	NPS_SURVEY_MODAL_KEY,
	CONTACT_PROMPT_MODAL_KEY,
} from '@/constants';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { IUserSettings, NpsSurveyState } from 'n8n-workflow';
import { useSettingsStore } from './settings.store';
import { updateNpsSurveyState } from '@n8n/rest-api-client/api/npsSurvey';
import type { N8nPrompts } from '@n8n/rest-api-client/api/prompts';
import { getPromptsData } from '@n8n/rest-api-client/api/prompts';
import { assert } from '@n8n/utils/assert';

export const MAXIMUM_TIMES_TO_SHOW_SURVEY_IF_IGNORED = 3;

export const useNpsSurveyStore = defineStore('npsSurvey', () => {
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const settingsStore = useSettingsStore();

	const shouldShowNpsSurveyNext = ref<boolean>(false);
	const currentSurveyState = ref<NpsSurveyState | undefined>();
	const currentUserId = ref<string | undefined>();
	const promptsData = ref<N8nPrompts | undefined>();

	function setupNpsSurveyOnLogin(userId: string, settings?: IUserSettings | null): void {
		currentUserId.value = userId;

		if (settings) {
			setShouldShowNpsSurvey(settings);
		}
	}

	function setShouldShowNpsSurvey(settings: IUserSettings) {
		if (!settingsStore.isTelemetryEnabled) {
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

		uiStore.openModal(NPS_SURVEY_MODAL_KEY);
		shouldShowNpsSurveyNext.value = false;

		const updatedState: NpsSurveyState = {
			waitingForResponse: true,
			lastShownAt: Date.now(),
			ignoredCount:
				currentSurveyState.value && 'ignoredCount' in currentSurveyState.value
					? currentSurveyState.value.ignoredCount
					: 0,
		};
		await updateNpsSurveyState(rootStore.restApiContext, updatedState);
		currentSurveyState.value = updatedState;
	}

	async function respondNpsSurvey() {
		assert(currentSurveyState.value);

		const updatedState: NpsSurveyState = {
			responded: true,
			lastShownAt: currentSurveyState.value.lastShownAt,
		};
		await updateNpsSurveyState(rootStore.restApiContext, updatedState);
		currentSurveyState.value = updatedState;
	}

	async function ignoreNpsSurvey() {
		assert(currentSurveyState.value);

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
		await updateNpsSurveyState(rootStore.restApiContext, updatedState);
		currentSurveyState.value = updatedState;
	}

	async function fetchPromptsData(): Promise<void> {
		assert(currentUserId.value);
		if (!settingsStore.isTelemetryEnabled) {
			return;
		}

		try {
			promptsData.value = await getPromptsData(
				settingsStore.settings.instanceId,
				currentUserId.value,
			);
		} catch (e) {
			console.error('Failed to fetch prompts data');
		}

		if (promptsData.value?.showContactPrompt) {
			uiStore.openModal(CONTACT_PROMPT_MODAL_KEY);
		} else {
			await useNpsSurveyStore().showNpsSurveyIfPossible();
		}
	}

	return {
		promptsData,
		resetNpsSurveyOnLogOut,
		showNpsSurveyIfPossible,
		ignoreNpsSurvey,
		respondNpsSurvey,
		setupNpsSurveyOnLogin,
		fetchPromptsData,
	};
});
