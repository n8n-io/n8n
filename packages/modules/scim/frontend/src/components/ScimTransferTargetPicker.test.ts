import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';

import ScimTransferTargetPicker from './ScimTransferTargetPicker.vue';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));

type ApiMock = (...args: unknown[]) => Promise<unknown>;
const fetchScimTransferTargetsMock = vi.fn<ApiMock>();

vi.mock('../scim.api', () => ({
	getScimConfig: vi.fn(),
	updateScimConfig: vi.fn(),
	generateScimToken: vi.fn(),
	revokeScimToken: vi.fn(),
	fetchScimTransferTargets: async (...args: unknown[]) =>
		await fetchScimTransferTargetsMock(...args),
}));

const people = [
	{
		projectId: 'p-jan',
		userId: 'u-jan',
		firstName: 'Jan',
		lastName: 'Kowalski',
		email: 'jan@acme.io',
		role: 'global:owner',
	},
	{
		projectId: 'p-hana',
		userId: 'u-hana',
		firstName: 'Hana',
		lastName: 'Satō',
		email: 'hana.sato@acme.io',
		role: 'global:admin',
	},
];

const projects = [
	{
		projectId: 'p-finance',
		name: 'Finance',
		icon: { type: 'emoji', value: '💰' } as const,
		memberCount: 5,
		workflowCount: 23,
	},
];

const fullResponse = {
	people: { total: 200, count: 200, items: people },
	projects: { total: 50, count: 50, items: projects },
};

const render = (props: { modelValue?: string | null } = {}) => {
	const pinia = createTestingPinia({ stubActions: false });
	return createComponentRenderer(ScimTransferTargetPicker, { pinia })({
		props: { modelValue: null, autoFocus: true, ...props },
	});
};

const openList = async () => {
	const input = screen.getByRole('combobox');
	await userEvent.click(input);
	return input;
};

describe('ScimTransferTargetPicker', () => {
	beforeEach(() => {
		fetchScimTransferTargetsMock.mockReset();
		fetchScimTransferTargetsMock.mockResolvedValue(fullResponse);
	});

	it('loads the first page on mount and shows People, then Projects, with their totals', async () => {
		render();
		await openList();

		await waitFor(() => expect(fetchScimTransferTargetsMock).toHaveBeenCalledTimes(1));
		expect(fetchScimTransferTargetsMock).toHaveBeenCalledWith(expect.anything(), {});

		const groups = await screen.findAllByRole('group');
		expect(groups[0]).toHaveAccessibleName('People · 200');
		expect(groups[1]).toHaveAccessibleName('Projects · 50');
		expect(screen.getByRole('option', { name: /Jan Kowalski/ })).toHaveTextContent(
			'Owner · jan@acme.io',
		);
		expect(screen.getByRole('option', { name: /Finance/ })).toHaveTextContent(
			'5 members · 23 workflows',
		);
	});

	it('sends one debounced search request per query and shows "N of total" counts', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const { emitted } = render();
		await openList();
		await waitFor(() => expect(fetchScimTransferTargetsMock).toHaveBeenCalledTimes(1));
		fetchScimTransferTargetsMock.mockResolvedValue({
			people: { total: 200, count: 1, items: [people[0]] },
			projects: { total: 50, count: 0, items: [] },
		});

		await userEvent.type(screen.getByRole('combobox'), 'jan');
		expect(fetchScimTransferTargetsMock).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(400);

		expect(fetchScimTransferTargetsMock).toHaveBeenCalledTimes(2);
		expect(fetchScimTransferTargetsMock).toHaveBeenLastCalledWith(expect.anything(), {
			search: 'jan',
		});
		const groups = await screen.findAllByRole('group');
		expect(groups[0]).toHaveAccessibleName('People · 1 of 200');
		expect(emitted('searchUsed')).toHaveLength(1);
		vi.useRealTimers();
	});

	it('shows a "Clear search" row when nothing matches, and selecting it clears the query', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		render();
		await openList();
		await waitFor(() => expect(fetchScimTransferTargetsMock).toHaveBeenCalledTimes(1));
		fetchScimTransferTargetsMock.mockResolvedValue({
			people: { total: 200, count: 0, items: [] },
			projects: { total: 50, count: 0, items: [] },
		});

		await userEvent.type(screen.getByRole('combobox'), 'zzz');
		await vi.advanceTimersByTimeAsync(400);

		const clearRow = await screen.findByRole('option', { name: 'Clear search' });
		expect(screen.getByRole('group')).toHaveAccessibleName('No people or projects match “zzz”');

		fetchScimTransferTargetsMock.mockResolvedValue(fullResponse);
		await userEvent.click(clearRow);
		await vi.advanceTimersByTimeAsync(400);

		expect(screen.getByRole('combobox')).toHaveValue('');
		expect(await screen.findByRole('option', { name: /Jan Kowalski/ })).toBeInTheDocument();
		vi.useRealTimers();
	});

	it('emits the personal project id and the type when a person is picked', async () => {
		const { emitted } = render();
		await openList();

		await userEvent.click(await screen.findByRole('option', { name: /Hana Satō/ }));

		expect(emitted('update:modelValue')).toEqual([[{ projectId: 'p-hana', type: 'person' }]]);
	});

	it('emits the project id and the type when a team project is picked', async () => {
		const { emitted } = render();
		await openList();

		await userEvent.click(await screen.findByRole('option', { name: /Finance/ }));

		expect(emitted('update:modelValue')).toEqual([[{ projectId: 'p-finance', type: 'project' }]]);
	});

	it('shows the loading error text when the search fails', async () => {
		fetchScimTransferTargetsMock.mockRejectedValue(new Error('boom'));
		render();
		await openList();

		expect(await screen.findByText('Could not load people and projects')).toBeInTheDocument();
	});
});
