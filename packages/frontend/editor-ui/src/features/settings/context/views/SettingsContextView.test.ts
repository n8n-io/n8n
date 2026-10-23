import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import SettingsContextView from './SettingsContextView.vue';
import { useContextStore } from '../context.store';
import { useSkillsStore } from '../skills.store';

const push = vi.fn();
const flags = vi.hoisted(() => ({ preferences: true, skills: false }));

vi.mock('../context.utils', () => ({
	isContextPreferencesEnabled: () => flags.preferences,
	isContextSkillsEnabled: () => flags.skills,
}));
const showErrorMock = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock, showMessage: vi.fn() }),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: vi.fn(),
}));

const renderView = createComponentRenderer(SettingsContextView);

describe('SettingsContextView', () => {
	beforeEach(() => {
		createTestingPinia();
		flags.preferences = true;
		flags.skills = false;
		push.mockClear();
		showErrorMock.mockClear();
	});

	it('reports a failed count instead of leaving the row at zero', async () => {
		const contextStore = mockedStore(useContextStore);
		contextStore.fetchPreferenceCount.mockRejectedValueOnce(new Error('offline'));

		renderView();
		await new Promise(process.nextTick);

		expect(showErrorMock).toHaveBeenCalled();
	});

	it('shows a Preview label next to the page title', () => {
		const { getByText } = renderView();

		expect(getByText('Preview')).toBeInTheDocument();
	});

	it('lists Preferences, Skills and Sources', () => {
		const { getByTestId } = renderView();

		expect(getByTestId('settings-context-preferences-row')).toBeInTheDocument();
		expect(getByTestId('settings-context-skills-row')).toBeInTheDocument();
		expect(getByTestId('settings-context-sources-row')).toBeInTheDocument();
	});

	it('marks Skills and Sources as unavailable while the skills hub is off', () => {
		const { getByTestId } = renderView();

		expect(getByTestId('settings-context-skills-row')).toHaveTextContent('Coming soon');
		expect(getByTestId('settings-context-sources-row')).toHaveTextContent('Coming soon');
	});

	it.each([
		[0, '0 preferences'],
		[1, '1 preference'],
		[2, '2 preferences'],
	])('shows the count for %i as "%s"', (count, expected) => {
		const contextStore = mockedStore(useContextStore);
		contextStore.count = count;

		const { getByTestId } = renderView();

		expect(getByTestId('settings-context-preferences-row')).toHaveTextContent(expected);
	});

	it('opens the preferences list when the row is clicked', async () => {
		const { getByTestId } = renderView();

		await userEvent.click(getByTestId('settings-context-preferences-row'));

		expect(push).toHaveBeenCalledWith({ name: 'SettingsContextPreferences' });
	});

	describe('with the skills hub on', () => {
		beforeEach(() => {
			flags.skills = true;
		});

		it('shows the skill count and opens the skills list', async () => {
			const skillsStore = mockedStore(useSkillsStore);
			skillsStore.count = 7;

			const { getByTestId } = renderView();
			await new Promise(process.nextTick);

			expect(skillsStore.fetchSkillCount).toHaveBeenCalled();
			expect(getByTestId('settings-context-skills-row')).toHaveTextContent('7 skills');

			await userEvent.click(getByTestId('settings-context-skills-row'));
			expect(push).toHaveBeenCalledWith({ name: 'SettingsContextSkills' });
		});

		it('reports a failed skill count', async () => {
			mockedStore(useSkillsStore).fetchSkillCount.mockRejectedValueOnce(new Error('offline'));

			renderView();
			await new Promise(process.nextTick);

			expect(showErrorMock).toHaveBeenCalled();
		});

		it('hides Preferences when only the skills hub is on', () => {
			flags.preferences = false;

			const { queryByTestId } = renderView();

			expect(queryByTestId('settings-context-preferences-row')).not.toBeInTheDocument();
			expect(mockedStore(useContextStore).fetchPreferenceCount).not.toHaveBeenCalled();
		});
	});
});
