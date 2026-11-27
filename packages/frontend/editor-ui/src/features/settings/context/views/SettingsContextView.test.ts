import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import SettingsContextView from './SettingsContextView.vue';
import { useCollectionsStore } from '../collections.store';
import { useContextStore } from '../context.store';
import { useSkillsStore } from '../skills.store';

const push = vi.fn();
const flags = vi.hoisted(() => ({
	skills: false,
	preferences: true,
	managePreferences: false,
	collections: false,
}));

vi.mock('../context.utils', () => ({
	isContextSkillsEnabled: () => flags.skills,
	isContextPreferencesEnabled: () => flags.preferences,
	canManageContextPreferences: () => flags.managePreferences,
}));

vi.mock('@/features/shared/knowledge/useIsCollectionsEnabled', async () => {
	const { computed } = await import('vue');
	return { useIsCollectionsEnabled: () => computed(() => flags.collections) };
});
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
		flags.skills = false;
		flags.preferences = true;
		flags.managePreferences = false;
		flags.collections = false;
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

	it('lists Preferences and Skills, with no Sources row: sources show in the skills table', () => {
		const { getByTestId, queryByTestId } = renderView();

		expect(getByTestId('settings-context-preferences-row')).toBeInTheDocument();
		expect(getByTestId('settings-context-skills-row')).toBeInTheDocument();
		expect(queryByTestId('settings-context-sources-row')).toBeNull();
	});

	it('marks Skills as disabled and names the consumers while all of them are off', async () => {
		const skillsStore = mockedStore(useSkillsStore);
		const { getByTestId } = renderView();
		const row = getByTestId('settings-context-skills-row');

		expect(row).toHaveTextContent('Disabled');
		expect(row).toHaveTextContent(
			'Turn on agents, n8n Assistant, or instance-level MCP to use skills',
		);
		expect(skillsStore.fetchSkillCount).not.toHaveBeenCalled();

		await userEvent.click(row);

		expect(push).not.toHaveBeenCalled();
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

	describe('with preferences off', () => {
		beforeEach(() => {
			flags.preferences = false;
		});

		it('hides the preferences row from a member and reads no count', async () => {
			const contextStore = mockedStore(useContextStore);
			const { queryByTestId } = renderView();
			await new Promise(process.nextTick);

			expect(queryByTestId('settings-context-preferences-row')).toBeNull();
			expect(contextStore.fetchPreferenceCount).not.toHaveBeenCalled();
		});

		it('shows an admin a disabled row that opens the switch', async () => {
			flags.managePreferences = true;
			const contextStore = mockedStore(useContextStore);
			const { getByTestId } = renderView();
			await new Promise(process.nextTick);
			const row = getByTestId('settings-context-preferences-row');

			expect(row).toHaveTextContent('Disabled');
			expect(contextStore.fetchPreferenceCount).not.toHaveBeenCalled();

			await userEvent.click(row);
			expect(push).toHaveBeenCalledWith({ name: 'SettingsContextPreferences' });
		});
	});

	describe('collections', () => {
		it('hides the collections row and reads no count while collections are off', async () => {
			const collectionsStore = mockedStore(useCollectionsStore);
			const { queryByTestId } = renderView();
			await new Promise(process.nextTick);

			expect(queryByTestId('settings-context-collections-row')).toBeNull();
			expect(collectionsStore.fetchCollections).not.toHaveBeenCalled();
		});

		it('reads the collection count and shows "None yet" for zero', async () => {
			flags.collections = true;
			const collectionsStore = mockedStore(useCollectionsStore);
			collectionsStore.count = 0;

			const { getByTestId } = renderView();
			await new Promise(process.nextTick);

			expect(collectionsStore.fetchCollections).toHaveBeenCalled();
			expect(getByTestId('settings-context-collections-row')).toHaveTextContent('None yet');
		});

		it.each([
			[1, '1 collection'],
			[3, '3 collections'],
		])('shows the count for %i as "%s"', (count, expected) => {
			flags.collections = true;
			mockedStore(useCollectionsStore).count = count;

			const { getByTestId } = renderView();

			expect(getByTestId('settings-context-collections-row')).toHaveTextContent(expected);
		});

		it('reports a failed collection count', async () => {
			flags.collections = true;
			const error = new Error('offline');
			mockedStore(useCollectionsStore).fetchCollections.mockRejectedValueOnce(error);

			renderView();
			await new Promise(process.nextTick);

			expect(showErrorMock).toHaveBeenCalledWith(error, 'Could not load collections');
		});

		it('shows the collections row and opens the collections page', async () => {
			flags.collections = true;
			const { getByTestId } = renderView();
			const row = getByTestId('settings-context-collections-row');

			expect(row).toHaveTextContent('Collections');
			expect(row).toHaveTextContent('Reusable sets of knowledge any agent can use');

			await userEvent.click(row);

			expect(push).toHaveBeenCalledWith({ name: 'SettingsContextCollections' });
		});
	});

	describe('with the skills module on', () => {
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
	});
});
