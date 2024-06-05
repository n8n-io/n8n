import { createPinia, setActivePinia } from 'pinia';
import { MAXIMUM_TIMES_TO_SHOW_SURVEY_IF_IGNORED, useValueSurvey } from './valueSurvey.store';
import { THREE_DAYS_IN_MILLIS, TIME, VALUE_SURVEY_MODAL_KEY } from '@/constants';
import { useSettingsStore } from './settings.store';

const { openModal, valueSurveyIgnored, valueSurveyShown, valueSurveyResponded } = vi.hoisted(() => {
	return {
		openModal: vi.fn(),
		valueSurveyIgnored: vi.fn(),
		valueSurveyResponded: vi.fn(),
		valueSurveyShown: vi.fn(),
	};
});

vi.mock('@/stores/ui.store', () => ({
	useUIStore: vi.fn(() => ({
		openModal,
	})),
}));

vi.mock('@/api/valueSurvey', () => ({
	valueSurveyIgnored,
	valueSurveyResponded,
	valueSurveyShown,
}));

const NOW = 1717602004819;

vi.useFakeTimers({
	now: NOW,
});

describe('useValueSurvey', () => {
	let valueSurveyStore: ReturnType<typeof useValueSurvey>;

	beforeEach(() => {
		vi.restoreAllMocks();
		setActivePinia(createPinia());
		useSettingsStore().settings.telemetry = { enabled: true };
		valueSurveyStore = useValueSurvey();
	});

	it('by default, does not show survey', () => {
		valueSurveyStore.showValueSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(valueSurveyShown).not.toHaveBeenCalled();
	});

	it('does not show value survey if user activated less than 3 days ago', () => {
		valueSurveyStore.setupValueSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - THREE_DAYS_IN_MILLIS + 10000,
		});

		valueSurveyStore.showValueSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(valueSurveyShown).not.toHaveBeenCalled();
	});

	it('shows values survey if user activated more than 3 days ago and has yet to see survey', () => {
		valueSurveyStore.setupValueSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - THREE_DAYS_IN_MILLIS - 10000,
		});

		valueSurveyStore.showValueSurveyIfPossible();

		expect(openModal).toHaveBeenCalledWith(VALUE_SURVEY_MODAL_KEY);
		expect(valueSurveyShown).toHaveBeenCalled();
	});

	it('does not show value survey if user has seen and responded to survey', () => {
		valueSurveyStore.setupValueSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - 10 * TIME.DAY,
			valueSurveyLastResponseState: 'done',
			valueSurveyLastShownAt: NOW - 2 * TIME.DAY,
		});

		valueSurveyStore.showValueSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(valueSurveyShown).not.toHaveBeenCalled();
	});

	it('shows value survey if user has ignored survey more than 7 days ago', () => {
		valueSurveyStore.setupValueSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - 10 * TIME.DAY,
			valueSurveyLastResponseState: 'waiting',
			valueSurveyLastShownAt: NOW - 8 * TIME.DAY,
		});

		valueSurveyStore.showValueSurveyIfPossible();

		expect(openModal).toHaveBeenCalledWith(VALUE_SURVEY_MODAL_KEY);
		expect(valueSurveyShown).toHaveBeenCalled();
	});

	it('does not show value survey if user has ignored survey less than 7 days ago', () => {
		valueSurveyStore.setupValueSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - 10 * TIME.DAY,
			valueSurveyLastResponseState: 'waiting',
			valueSurveyLastShownAt: NOW - 5 * TIME.DAY,
		});

		valueSurveyStore.showValueSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(valueSurveyShown).not.toHaveBeenCalled();
	});

	it('does not show value survey if user has responded survey more than 7 days ago', () => {
		valueSurveyStore.setupValueSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - 10 * TIME.DAY,
			valueSurveyLastResponseState: 'done',
			valueSurveyLastShownAt: NOW - 8 * TIME.DAY,
		});

		valueSurveyStore.showValueSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(valueSurveyShown).not.toHaveBeenCalled();
	});

	it('shows value survey if user has responded survey more than 6 months ago', () => {
		valueSurveyStore.setupValueSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - 30 * 7 * TIME.DAY,
			valueSurveyLastResponseState: 'done',
			valueSurveyLastShownAt: NOW - (30 * 6 + 1) * TIME.DAY,
		});

		valueSurveyStore.showValueSurveyIfPossible();

		expect(openModal).toHaveBeenCalledWith(VALUE_SURVEY_MODAL_KEY);
		expect(valueSurveyShown).toHaveBeenCalled();
	});

	it('calls ignore api when survey is ignored', () => {
		valueSurveyStore.setupValueSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - 30 * 7 * TIME.DAY,
			valueSurveyLastResponseState: 'done',
			valueSurveyLastShownAt: NOW - (30 * 6 + 1) * TIME.DAY,
			valueSurveyIgnoredLastCount: 0,
		});

		valueSurveyStore.ignoreValueSurvey();

		expect(valueSurveyIgnored).toHaveBeenCalled();
	});

	it('calls respond api when survey is ignored more than maximum times', () => {
		valueSurveyStore.setupValueSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - 30 * 7 * TIME.DAY,
			valueSurveyLastResponseState: 'done',
			valueSurveyLastShownAt: NOW - (30 * 6 + 1) * TIME.DAY,
			valueSurveyIgnoredLastCount: MAXIMUM_TIMES_TO_SHOW_SURVEY_IF_IGNORED - 1,
		});

		valueSurveyStore.ignoreValueSurvey();

		expect(valueSurveyIgnored).not.toHaveBeenCalled();
		expect(valueSurveyResponded).toHaveBeenCalled();
	});

	it('calls respond api when response is given', () => {
		valueSurveyStore.respondValueSurvey();

		expect(valueSurveyResponded).toHaveBeenCalled();
	});

	it('does not show value survey twice in the same session', () => {
		valueSurveyStore.setupValueSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - THREE_DAYS_IN_MILLIS - 10000,
		});

		valueSurveyStore.showValueSurveyIfPossible();

		expect(openModal).toHaveBeenCalledWith(VALUE_SURVEY_MODAL_KEY);
		expect(valueSurveyShown).toHaveBeenCalled();

		openModal.mockReset();
		valueSurveyShown.mockReset();

		valueSurveyStore.showValueSurveyIfPossible();
		expect(openModal).not.toHaveBeenCalled();
		expect(valueSurveyShown).not.toHaveBeenCalled();
	});

	it('resets on logout, preventing value survey from showing', () => {
		valueSurveyStore.setupValueSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - THREE_DAYS_IN_MILLIS - 10000,
		});

		valueSurveyStore.resetValueSurveyOnLogOut();
		valueSurveyStore.showValueSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(valueSurveyShown).not.toHaveBeenCalled();
	});

	it('if telemetry is disabled, does not show value survey', () => {
		useSettingsStore().settings.telemetry = { enabled: false };
		valueSurveyStore.setupValueSurveyOnLogin({
			userActivated: true,
			userActivatedAt: NOW - THREE_DAYS_IN_MILLIS - 10000,
		});

		valueSurveyStore.showValueSurveyIfPossible();

		expect(openModal).not.toHaveBeenCalled();
		expect(valueSurveyShown).not.toHaveBeenCalled();
	});
});
