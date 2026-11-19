import { waitAllPromises } from '@n8n/frontend-test-utils';
import type { Project } from '@n8n/rest-api-client';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { useAssigneeOptions } from './useAssigneeOptions';
import { withSetup } from '../__tests__/fixtures';
import { fetchProjectAgents, fetchProjectWithMembers } from '../task-board.api';

vi.mock('../task-board.api');

async function loadOptions() {
	const settingsStore = useSettingsStore();
	settingsStore.settings = { ...settingsStore.settings, activeModules: ['agents'] };
	vi.mocked(fetchProjectWithMembers).mockResolvedValue({
		relations: [
			{
				id: 'u1',
				firstName: 'Ada',
				lastName: 'Lovelace',
				email: 'ada@example.com',
				role: 'project:admin',
			},
		],
	} as Project);
	vi.mocked(fetchProjectAgents).mockResolvedValue([
		{ id: 'a1', name: 'Dev agent', isArchived: false },
		{ id: 'a2', name: 'Old agent', isArchived: true },
		{ id: 'a3', name: 'Agent of another board', isArchived: false },
	]);
	const options = withSetup(() => useAssigneeOptions('p1', ['a1', 'a2']));
	await waitAllPromises();
	return options;
}

describe('useAssigneeOptions', () => {
	beforeEach(() => vi.resetAllMocks());

	it('offers "Unassigned", the project members and the agents of the board that are not archived', async () => {
		const options = await loadOptions();

		expect(options.items.value).toEqual([
			{ value: 'unassigned', label: 'Unassigned' },
			{
				type: 'group',
				label: 'People',
				items: [{ value: 'user:u1', label: 'Ada Lovelace', icon: 'user' }],
			},
			{
				type: 'group',
				label: 'Agents',
				items: [{ value: 'agent:a1', label: 'Dev agent', icon: 'bot' }],
			},
		]);
	});

	it('keeps the current assignee as an option when the lists do not have it', async () => {
		const options = await loadOptions();

		const items = options.itemsFor({ type: 'agent', id: 'a2', name: 'Old agent' });

		expect(items.at(-1)).toEqual({ value: 'agent:a2', label: 'Old agent', icon: 'bot' });
	});
});
