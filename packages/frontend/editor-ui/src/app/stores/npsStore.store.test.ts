import { createPinia, setActivePinia } from 'pinia';
import { useNpsSurveyStore } from './npsSurvey.store';
import {
	THREE_DAYS_IN_MILLIS,
	TIME,
	NPS_SURVEY_MODAL_KEY,
	LOCAL_STORAGE_PROMPTS_DATA_CACHE,
} from '@/app/constants';
import { useSettingsStore } from './settings.store';
import type { N8nPrompts } from '@n8n/rest-api-client/api/prompts';
import { jsonParse } from 'n8n-workflow';

const { openModal, updateNpsSurveyState, getPromptsData } = vi.hoisted(() => {
	return {
		openModal: vi.fn(),
		updateNpsSurveyState: vi.fn(),
		getPromptsData: vi.fn(),
	};
});

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: vi.fn(() => ({
		openModal,
	})),
}));

vi.mock('@n8n/rest-api-client/api/npsSurvey', () => ({
	updateNpsSurveyState,
}));

vi.mock('@n8n/rest-api-client/api/prompts', () => ({
	getPromptsData,
}));

const NOW = 1717602004819;

vi.useFakeTimers({
	now: NOW,
});

describe('useNpsSurvey', () => {
	let npsSurveyStore: ReturnType<typeof useNpsSurveyStore>;

	beforeEach(() => {
		vi.restoreAllMocks();
		setActivePinia(createPinia());
		useSettingsStore().settings.telemetry = { enabled: true };
		npsSurveyStore = useNpsSurveyStore();
	});

	it('by default, without login, does not show survey', async () => {
		await npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(updateNpsSurveyState).not.toHaveBeenCalled();
	});

	it('does not show nps survey if user activated less than 3 days ago', async () => {
		npsSurveyStore.setupNpsSurveyOnLogin('1', {
			userActivated: true,
			userActivatedAt: NOW - THREE_DAYS_IN_MILLIS + 10000,
		});

		await npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(updateNpsSurveyState).not.toHaveBeenCalled();
	});

	it('shows nps survey if user activated more than 3 days ago and has yet to see survey', async () => {
		npsSurveyStore.setupNpsSurveyOnLogin('1', {
			userActivated: true,
			userActivatedAt: NOW - THREE_DAYS_IN_MILLIS - 10000,
		});

		await npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).toHaveBeenCalledWith(NPS_SURVEY_MODAL_KEY);
		expect(updateNpsSurveyState).toHaveBeenCalledWith(
			expect.objectContaining({
				baseUrl: '/rest',
			}),
			{
				ignoredCount: 0,
				lastShownAt: NOW,
				waitingForResponse: true,
			},
		);
	});

	it('does not show nps survey if user has seen and responded to survey less than 6 months ago', async () => {
		npsSurveyStore.setupNpsSurveyOnLogin('1', {
			userActivated: true,
			userActivatedAt: NOW - 10 * TIME.DAY,
			npsSurvey: {
				responded: true,
				lastShownAt: NOW - 2 * TIME.DAY,
			},
		});

		await npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(updateNpsSurveyState).not.toHaveBeenCalledWith();
	});

	it('does not show nps survey if user has responded survey more than 7 days ago', async () => {
		npsSurveyStore.setupNpsSurveyOnLogin('1', {
			userActivated: true,
			userActivatedAt: NOW - 10 * TIME.DAY,
			npsSurvey: {
				responded: true,
				lastShownAt: NOW - 8 * TIME.DAY,
			},
		});

		await npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(updateNpsSurveyState).not.toHaveBeenCalled();
	});

	it('shows nps survey if user has responded survey more than 6 months ago', async () => {
		npsSurveyStore.setupNpsSurveyOnLogin('1', {
			userActivated: true,
			userActivatedAt: NOW - 30 * 7 * TIME.DAY,
			npsSurvey: {
				responded: true,
				lastShownAt: NOW - (30 * 6 + 1) * TIME.DAY,
			},
		});

		await npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).toHaveBeenCalledWith(NPS_SURVEY_MODAL_KEY);
		expect(updateNpsSurveyState).toHaveBeenCalledWith(
			expect.objectContaining({
				baseUrl: '/rest',
			}),
			{
				ignoredCount: 0,
				lastShownAt: NOW,
				waitingForResponse: true,
			},
		);
	});

	it('does not show nps survey if user has ignored survey less than 7 days ago', async () => {
		npsSurveyStore.setupNpsSurveyOnLogin('1', {
			userActivated: true,
			userActivatedAt: NOW - 10 * TIME.DAY,
			npsSurvey: {
				waitingForResponse: true,
				lastShownAt: NOW - 5 * TIME.DAY,
				ignoredCount: 0,
			},
		});

		await npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(updateNpsSurveyState).not.toHaveBeenCalled();
	});

	it('shows nps survey if user has ignored survey more than 7 days ago', async () => {
		npsSurveyStore.setupNpsSurveyOnLogin('1', {
			userActivated: true,
			userActivatedAt: NOW - 10 * TIME.DAY,
			npsSurvey: {
				waitingForResponse: true,
				lastShownAt: NOW - 8 * TIME.DAY,
				ignoredCount: 0,
			},
		});

		await npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).toHaveBeenCalledWith(NPS_SURVEY_MODAL_KEY);
		expect(updateNpsSurveyState).toHaveBeenCalledWith(
			expect.objectContaining({
				baseUrl: '/rest',
			}),
			{
				ignoredCount: 0,
				lastShownAt: NOW,
				waitingForResponse: true,
			},
		);
	});

	it('increments ignore count when survey is ignored', async () => {
		npsSurveyStore.setupNpsSurveyOnLogin('1', {
			userActivated: true,
			userActivatedAt: NOW - 30 * 7 * TIME.DAY,
			npsSurvey: {
				responded: true,
				lastShownAt: NOW - (30 * 6 + 1) * TIME.DAY,
			},
		});

		await npsSurveyStore.ignoreNpsSurvey();

		expect(updateNpsSurveyState).toHaveBeenCalledWith(
			expect.objectContaining({
				baseUrl: '/rest',
			}),
			{
				ignoredCount: 1,
				lastShownAt: NOW - (30 * 6 + 1) * TIME.DAY,
				waitingForResponse: true,
			},
		);
	});

	it('updates state to responded if ignored more than maximum times', async () => {
		npsSurveyStore.setupNpsSurveyOnLogin('1', {
			userActivated: true,
			userActivatedAt: NOW - 30 * 7 * TIME.DAY,
			npsSurvey: {
				waitingForResponse: true,
				lastShownAt: NOW - (30 * 6 + 1) * TIME.DAY,
				ignoredCount: 2,
			},
		});

		await npsSurveyStore.ignoreNpsSurvey();

		expect(updateNpsSurveyState).toHaveBeenCalledWith(
			expect.objectContaining({
				baseUrl: '/rest',
			}),
			{
				lastShownAt: NOW - (30 * 6 + 1) * TIME.DAY,
				responded: true,
			},
		);
	});

	it('updates state to responded when response is given', async () => {
		npsSurveyStore.setupNpsSurveyOnLogin('1', {
			userActivated: true,
			userActivatedAt: NOW - 30 * 7 * TIME.DAY,
			npsSurvey: {
				responded: true,
				lastShownAt: NOW - (30 * 6 + 1) * TIME.DAY,
			},
		});

		await npsSurveyStore.respondNpsSurvey();

		expect(updateNpsSurveyState).toHaveBeenCalledWith(
			expect.objectContaining({
				baseUrl: '/rest',
			}),
			{
				responded: true,
				lastShownAt: NOW - (30 * 6 + 1) * TIME.DAY,
			},
		);
	});

	it('does not show nps survey twice in the same session', async () => {
		npsSurveyStore.setupNpsSurveyOnLogin('1', {
			userActivated: true,
			userActivatedAt: NOW - THREE_DAYS_IN_MILLIS - 10000,
		});

		await npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).toHaveBeenCalledWith(NPS_SURVEY_MODAL_KEY);
		expect(updateNpsSurveyState).toHaveBeenCalledWith(
			expect.objectContaining({
				baseUrl: '/rest',
			}),
			{
				ignoredCount: 0,
				lastShownAt: NOW,
				waitingForResponse: true,
			},
		);

		openModal.mockReset();
		updateNpsSurveyState.mockReset();

		await npsSurveyStore.showNpsSurveyIfPossible();
		expect(openModal).not.toHaveBeenCalled();
		expect(updateNpsSurveyState).not.toHaveBeenCalled();
	});

	it('resets on logout, preventing nps survey from showing', async () => {
		npsSurveyStore.setupNpsSurveyOnLogin('1', {
			userActivated: true,
			userActivatedAt: NOW - THREE_DAYS_IN_MILLIS - 10000,
		});

		npsSurveyStore.resetNpsSurveyOnLogOut();
		await npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(updateNpsSurveyState).not.toHaveBeenCalled();
	});

	it('if telemetry is disabled, does not show nps survey', async () => {
		useSettingsStore().settings.telemetry = { enabled: false };
		npsSurveyStore.setupNpsSurveyOnLogin('1', {
			userActivated: true,
			userActivatedAt: NOW - THREE_DAYS_IN_MILLIS - 10000,
		});

		await npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(updateNpsSurveyState).not.toHaveBeenCalled();
	});
});

describe('fetchPromptsData caching', () => {
	const USER_ID = 'test-user-123';
	const INSTANCE_ID = 'test-instance';
	const CACHE_KEY = LOCAL_STORAGE_PROMPTS_DATA_CACHE(USER_ID);

	const mockPromptsData: N8nPrompts = {
		showContactPrompt: false,
	};

	let npsSurveyStore: ReturnType<typeof useNpsSurveyStore>;

	beforeEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
		setActivePinia(createPinia());
		const settingsStore = useSettingsStore();
		settingsStore.settings.telemetry = { enabled: true };
		settingsStore.settings.instanceId = INSTANCE_ID;
		npsSurveyStore = useNpsSurveyStore();
		npsSurveyStore.setupNpsSurveyOnLogin(USER_ID, { userActivated: false });
	});

	it('fetches from API and caches when no cache exists', async () => {
		getPromptsData.mockResolvedValue(mockPromptsData);

		await npsSurveyStore.fetchPromptsData();

		expect(getPromptsData).toHaveBeenCalledWith(INSTANCE_ID, USER_ID);
		expect(npsSurveyStore.promptsData).toEqual(mockPromptsData);

		const cached: unknown = jsonParse(localStorage.getItem(CACHE_KEY)!);
		expect(cached).toEqual({
			data: mockPromptsData,
			timestamp: NOW,
		});
	});

	it('uses cached data without API call when cache is valid', async () => {
		const cachedData = {
			data: mockPromptsData,
			timestamp: NOW - TIME.DAY + 1000, // Just under 1 day old
		};
		localStorage.setItem(CACHE_KEY, JSON.stringify(cachedData));

		await npsSurveyStore.fetchPromptsData();

		expect(getPromptsData).not.toHaveBeenCalled();
		expect(npsSurveyStore.promptsData).toEqual(mockPromptsData);
	});

	it('fetches from API when cache is expired', async () => {
		const expiredCache = {
			data: { showContactPrompt: true },
			timestamp: NOW - TIME.DAY - 1000, // Just over 1 day old
		};
		localStorage.setItem(CACHE_KEY, JSON.stringify(expiredCache));
		getPromptsData.mockResolvedValue(mockPromptsData);

		await npsSurveyStore.fetchPromptsData();

		expect(getPromptsData).toHaveBeenCalledWith(INSTANCE_ID, USER_ID);
		expect(npsSurveyStore.promptsData).toEqual(mockPromptsData);
	});

	it('fetches from API when cache is invalid JSON', async () => {
		localStorage.setItem(CACHE_KEY, 'invalid-json');
		getPromptsData.mockResolvedValue(mockPromptsData);

		await npsSurveyStore.fetchPromptsData();

		expect(getPromptsData).toHaveBeenCalledWith(INSTANCE_ID, USER_ID);
		expect(npsSurveyStore.promptsData).toEqual(mockPromptsData);
	});

	it('fetches from API when cache has invalid structure', async () => {
		localStorage.setItem(CACHE_KEY, JSON.stringify({ invalid: 'structure' }));
		getPromptsData.mockResolvedValue(mockPromptsData);

		await npsSurveyStore.fetchPromptsData();

		expect(getPromptsData).toHaveBeenCalledWith(INSTANCE_ID, USER_ID);
		expect(npsSurveyStore.promptsData).toEqual(mockPromptsData);
	});

	it('does not fetch when telemetry is disabled', async () => {
		useSettingsStore().settings.telemetry = { enabled: false };

		await npsSurveyStore.fetchPromptsData();

		expect(getPromptsData).not.toHaveBeenCalled();
		expect(localStorage.getItem(CACHE_KEY)).toBeNull();
	});

	it('does not cache when showContactPrompt is true', async () => {
		const promptsWithContactPrompt: N8nPrompts = { showContactPrompt: true };
		getPromptsData.mockResolvedValue(promptsWithContactPrompt);

		await npsSurveyStore.fetchPromptsData();

		expect(getPromptsData).toHaveBeenCalledWith(INSTANCE_ID, USER_ID);
		expect(npsSurveyStore.promptsData).toEqual(promptsWithContactPrompt);
		expect(localStorage.getItem(CACHE_KEY)).toBeNull();
	});
});
