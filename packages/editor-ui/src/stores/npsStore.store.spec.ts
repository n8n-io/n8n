import { createPinia, setActivePinia } from 'pinia';
import { MAXIMUM_TIMES_TO_SHOW_SURVEY_IF_IGNORED, useNpsSurveyStore } from './npsSurvey.store';
import { THREE_DAYS_IN_MILLIS, TIME, NPS_SURVEY_MODAL_KEY } from '@/constants';
import { useSettingsStore } from './settings.store';

const { openModal, npsSurveyIgnored, npsSurveyShown, npsSurveyResponded } = vi.hoisted(() => {
	return {
		openModal: vi.fn(),
		npsSurveyIgnored: vi.fn(),
		npsSurveyResponded: vi.fn(),
		npsSurveyShown: vi.fn(),
	};
});

vi.mock('@/stores/ui.store', () => ({
	useUIStore: vi.fn(() => ({
		openModal,
	})),
}));

vi.mock('@/api/npsSurvey', () => ({
	npsSurveyIgnored,
	npsSurveyResponded,
	npsSurveyShown,
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

	it('by default, does not show survey', () => {
		npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(npsSurveyShown).not.toHaveBeenCalled();
	});

	it('does not show nps survey if user activated less than 3 days ago', () => {
		npsSurveyStore.setupNpsSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - THREE_DAYS_IN_MILLIS + 10000,
		});

		npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(npsSurveyShown).not.toHaveBeenCalled();
	});

	it('shows nps survey if user activated more than 3 days ago and has yet to see survey', () => {
		npsSurveyStore.setupNpsSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - THREE_DAYS_IN_MILLIS - 10000,
		});

		npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).toHaveBeenCalledWith(NPS_SURVEY_MODAL_KEY);
		expect(npsSurveyShown).toHaveBeenCalled();
	});

	it('does not show nps survey if user has seen and responded to survey', () => {
		npsSurveyStore.setupNpsSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - 10 * TIME.DAY,
			npsSurveyLastResponseState: 'done',
			npsSurveyLastShownAt: NOW - 2 * TIME.DAY,
		});

		npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(npsSurveyShown).not.toHaveBeenCalled();
	});

	it('shows nps survey if user has ignored survey more than 7 days ago', () => {
		npsSurveyStore.setupNpsSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - 10 * TIME.DAY,
			npsSurveyLastResponseState: 'waiting',
			npsSurveyLastShownAt: NOW - 8 * TIME.DAY,
		});

		npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).toHaveBeenCalledWith(NPS_SURVEY_MODAL_KEY);
		expect(npsSurveyShown).toHaveBeenCalled();
	});

	it('does not show nps survey if user has ignored survey less than 7 days ago', () => {
		npsSurveyStore.setupNpsSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - 10 * TIME.DAY,
			npsSurveyLastResponseState: 'waiting',
			npsSurveyLastShownAt: NOW - 5 * TIME.DAY,
		});

		npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(npsSurveyShown).not.toHaveBeenCalled();
	});

	it('does not show nps survey if user has responded survey more than 7 days ago', () => {
		npsSurveyStore.setupNpsSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - 10 * TIME.DAY,
			npsSurveyLastResponseState: 'done',
			npsSurveyLastShownAt: NOW - 8 * TIME.DAY,
		});

		npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(npsSurveyShown).not.toHaveBeenCalled();
	});

	it('shows nps survey if user has responded survey more than 6 months ago', () => {
		npsSurveyStore.setupNpsSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - 30 * 7 * TIME.DAY,
			npsSurveyLastResponseState: 'done',
			npsSurveyLastShownAt: NOW - (30 * 6 + 1) * TIME.DAY,
		});

		npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).toHaveBeenCalledWith(NPS_SURVEY_MODAL_KEY);
		expect(npsSurveyShown).toHaveBeenCalled();
	});

	it('calls ignore api when survey is ignored', () => {
		npsSurveyStore.setupNpsSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - 30 * 7 * TIME.DAY,
			npsSurveyLastResponseState: 'done',
			npsSurveyLastShownAt: NOW - (30 * 6 + 1) * TIME.DAY,
			npsSurveyIgnoredLastCount: 0,
		});

		npsSurveyStore.ignoreNpsSurvey();

		expect(npsSurveyIgnored).toHaveBeenCalled();
	});

	it('calls respond api when survey is ignored more than maximum times', () => {
		npsSurveyStore.setupNpsSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - 30 * 7 * TIME.DAY,
			npsSurveyLastResponseState: 'done',
			npsSurveyLastShownAt: NOW - (30 * 6 + 1) * TIME.DAY,
			npsSurveyIgnoredLastCount: MAXIMUM_TIMES_TO_SHOW_SURVEY_IF_IGNORED - 1,
		});

		npsSurveyStore.ignoreNpsSurvey();

		expect(npsSurveyIgnored).not.toHaveBeenCalled();
		expect(npsSurveyResponded).toHaveBeenCalled();
	});

	it('calls respond api when response is given', () => {
		npsSurveyStore.respondNpsSurvey();

		expect(npsSurveyResponded).toHaveBeenCalled();
	});

	it('does not show nps survey twice in the same session', () => {
		npsSurveyStore.setupNpsSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - THREE_DAYS_IN_MILLIS - 10000,
		});

		npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).toHaveBeenCalledWith(NPS_SURVEY_MODAL_KEY);
		expect(npsSurveyShown).toHaveBeenCalled();

		openModal.mockReset();
		npsSurveyShown.mockReset();

		npsSurveyStore.showNpsSurveyIfPossible();
		expect(openModal).not.toHaveBeenCalled();
		expect(npsSurveyShown).not.toHaveBeenCalled();
	});

	it('resets on logout, preventing nps survey from showing', () => {
		npsSurveyStore.setupNpsSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - THREE_DAYS_IN_MILLIS - 10000,
		});

		npsSurveyStore.resetNpsSurveyOnLogOut();
		npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(npsSurveyShown).not.toHaveBeenCalled();
	});

	it('if telemetry is disabled, does not show nps survey', () => {
		useSettingsStore().settings.telemetry = { enabled: false };
		npsSurveyStore.setupNpsSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - THREE_DAYS_IN_MILLIS - 10000,
		});

		npsSurveyStore.showNpsSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(npsSurveyShown).not.toHaveBeenCalled();
	});
});
