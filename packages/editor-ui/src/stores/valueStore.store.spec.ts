import { createPinia, setActivePinia } from 'pinia';
import { useValueSurvey } from './valueSurvey.store';
import { valueSurveyShown } from '@/api/valueSurvey';
import { THREE_DAYS_IN_MILLIS, TIME } from '@/constants';
import { useSettingsStore } from './settings.store';

const openModal = vi.fn();

vi.mock('@/stores/ui.store', () => ({
	useUIStore: vi.fn(() => ({
		openModal,
	})),
}));

vi.mock('@/api/valueSurvey', () => ({
	valueSurveyShown: vi.fn(),
	valueSurveyResponded: vi.fn(),
	valueSurveyIgnored: vi.fn(),
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

		expect(openModal).toHaveBeenCalled();
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

		expect(openModal).toHaveBeenCalled();
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

		expect(openModal).toHaveBeenCalled();
		expect(valueSurveyShown).toHaveBeenCalled();
	});
});
