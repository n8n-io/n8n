import { createPinia, setActivePinia } from 'pinia';
import { useNpsSurveyStore } from './npsSurvey.store';
import { THREE_DAYS_IN_MILLIS, TIME, NPS_SURVEY_MODAL_KEY } from '@/constants';
import { useSettingsStore } from './settings.store';

const { openModal, updateNpsSurveyState } = vi.hoisted(() => {
	return {
		openModal: vi.fn(),
		updateNpsSurveyState: vi.fn(),
	};
});

vi.mock('@/stores/ui.store', () => ({
	useUIStore: vi.fn(() => ({
		openModal,
	})),
}));

vi.mock('@n8n/rest-api-client/api/npsSurvey', () => ({
	updateNpsSurveyState,
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
