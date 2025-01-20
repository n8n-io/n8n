import { within, waitFor } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { useRoute } from 'vue-router';
import { createComponentRenderer } from '@/__tests__/render';
import SourceControlPushModal from '@/components/SourceControlPushModal.ee.vue';
import { createTestingPinia } from '@pinia/testing';
import { createEventBus } from 'n8n-design-system';
import type { SourceControlledFile } from '@n8n/api-types';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { mockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/constants';

const eventBus = createEventBus();

vi.mock('vue-router', () => ({
	useRoute: vi.fn().mockReturnValue({
		name: vi.fn(),
		params: vi.fn(),
		fullPath: vi.fn(),
	}),
	RouterLink: vi.fn(),
	useRouter: vi.fn(),
}));

let route: ReturnType<typeof useRoute>;

const RecycleScroller = {
	props: {
		items: Array,
	},
	template: '<div><template v-for="item in items"><slot v-bind="{ item }"></slot></template></div>',
};

const renderModal = createComponentRenderer(SourceControlPushModal, {
	global: {
		stubs: {
			RecycleScroller,
			Modal: {
				template: `
					<div>
						<slot name="header" />
						<slot name="title" />
						<slot name="content" />
						<slot name="footer" />
					</div>
				`,
			},
		},
	},
});

describe('SourceControlPushModal', () => {
	beforeEach(() => {
		route = useRoute();
		createTestingPinia();
	});

	it('mounts', () => {
		vi.spyOn(route, 'fullPath', 'get').mockReturnValue('');

		const { getByText } = renderModal({
			pinia: createTestingPinia(),
			props: {
				data: {
					eventBus,
					status: [],
				},
			},
		});
		expect(getByText('Commit and push changes')).toBeInTheDocument();
	});

	it('should toggle checkboxes', async () => {
		const status: SourceControlledFile[] = [
			{
				id: 'gTbbBkkYTnNyX1jD',
				name: 'My workflow 1',
				type: 'workflow',
				status: 'created',
				location: 'local',
				conflict: false,
				file: '/home/user/.n8n/git/workflows/gTbbBkkYTnNyX1jD.json',
				updatedAt: '2024-09-20T10:31:40.000Z',
			},
			{
				id: 'JIGKevgZagmJAnM6',
				name: 'My workflow 2',
				type: 'workflow',
				status: 'created',
				location: 'local',
				conflict: false,
				file: '/home/user/.n8n/git/workflows/JIGKevgZagmJAnM6.json',
				updatedAt: '2024-09-20T14:42:51.968Z',
			},
		];

		const { getByTestId, getAllByTestId } = renderModal({
			props: {
				data: {
					eventBus,
					status,
				},
			},
		});

		const files = getAllByTestId('source-control-push-modal-file-checkbox');
		expect(files).toHaveLength(2);

		await userEvent.click(files[0]);
		expect(within(files[0]).getByRole('checkbox')).toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).not.toBeChecked();

		await userEvent.click(within(files[0]).getByRole('checkbox'));
		expect(within(files[0]).getByRole('checkbox')).not.toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).not.toBeChecked();

		await userEvent.click(within(files[1]).getByRole('checkbox'));
		expect(within(files[0]).getByRole('checkbox')).not.toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).toBeChecked();

		await userEvent.click(files[1]);
		expect(within(files[0]).getByRole('checkbox')).not.toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).not.toBeChecked();

		await userEvent.click(within(files[0]).getByText('My workflow 2'));
		expect(within(files[0]).getByRole('checkbox')).toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).not.toBeChecked();

		await userEvent.click(within(files[1]).getByText('My workflow 1'));
		expect(within(files[0]).getByRole('checkbox')).toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).toBeChecked();

		await userEvent.click(within(files[1]).getByText('My workflow 1'));
		expect(within(files[0]).getByRole('checkbox')).toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).not.toBeChecked();

		await userEvent.click(getByTestId('source-control-push-modal-toggle-all'));
		expect(within(files[0]).getByRole('checkbox')).toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).toBeChecked();

		await userEvent.click(within(files[0]).getByText('My workflow 2'));
		await userEvent.click(within(files[1]).getByText('My workflow 1'));
		expect(within(files[0]).getByRole('checkbox')).not.toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).not.toBeChecked();
		expect(
			within(getByTestId('source-control-push-modal-toggle-all')).getByRole('checkbox'),
		).not.toBeChecked();

		await userEvent.click(within(files[0]).getByText('My workflow 2'));
		await userEvent.click(within(files[1]).getByText('My workflow 1'));
		expect(within(files[0]).getByRole('checkbox')).toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).toBeChecked();
		expect(
			within(getByTestId('source-control-push-modal-toggle-all')).getByRole('checkbox'),
		).toBeChecked();

		await userEvent.click(getByTestId('source-control-push-modal-toggle-all'));
		expect(within(files[0]).getByRole('checkbox')).not.toBeChecked();
		expect(within(files[1]).getByRole('checkbox')).not.toBeChecked();
	});

	it('should push non workflow entities', async () => {
		const status: SourceControlledFile[] = [
			{
				id: 'gTbbBkkYTnNyX1jD',
				name: 'credential',
				type: 'credential',
				status: 'created',
				location: 'local',
				conflict: false,
				file: '',
				updatedAt: '2024-09-20T10:31:40.000Z',
			},
			{
				id: 'JIGKevgZagmJAnM6',
				name: 'variables',
				type: 'variables',
				status: 'created',
				location: 'local',
				conflict: false,
				file: '',
				updatedAt: '2024-09-20T14:42:51.968Z',
			},
			{
				id: 'mappings',
				name: 'tags',
				type: 'tags',
				status: 'modified',
				location: 'local',
				conflict: false,
				file: '/Users/raul/.n8n/git/tags.json',
				updatedAt: '2024-12-04T11:29:22.095Z',
			},
		];

		const sourceControlStore = mockedStore(useSourceControlStore);

		const { getByTestId, getByText } = renderModal({
			props: {
				data: {
					eventBus,
					status,
				},
			},
		});

		const submitButton = getByTestId('source-control-push-modal-submit');
		const commitMessage = 'commit message';
		expect(submitButton).toBeDisabled();
		expect(getByText('1 new credentials added, 0 deleted and 0 changed')).toBeInTheDocument();
		expect(getByText('At least one new variable has been added or modified')).toBeInTheDocument();
		expect(getByText('At least one new tag has been added or modified')).toBeInTheDocument();

		await userEvent.type(getByTestId('source-control-push-modal-commit'), commitMessage);

		expect(submitButton).not.toBeDisabled();
		await userEvent.click(submitButton);

		expect(sourceControlStore.pushWorkfolder).toHaveBeenCalledWith(
			expect.objectContaining({
				commitMessage,
				fileNames: expect.arrayContaining(status),
				force: true,
			}),
		);
	});

	it('should auto select currentWorkflow', async () => {
		const status: SourceControlledFile[] = [
			{
				id: 'gTbbBkkYTnNyX1jD',
				name: 'My workflow 1',
				type: 'workflow',
				status: 'created',
				location: 'local',
				conflict: false,
				file: '/home/user/.n8n/git/workflows/gTbbBkkYTnNyX1jD.json',
				updatedAt: '2024-09-20T10:31:40.000Z',
			},
			{
				id: 'JIGKevgZagmJAnM6',
				name: 'My workflow 2',
				type: 'workflow',
				status: 'created',
				location: 'local',
				conflict: false,
				file: '/home/user/.n8n/git/workflows/JIGKevgZagmJAnM6.json',
				updatedAt: '2024-09-20T14:42:51.968Z',
			},
		];

		vi.spyOn(route, 'name', 'get').mockReturnValue(VIEWS.WORKFLOW);
		vi.spyOn(route, 'params', 'get').mockReturnValue({ name: 'gTbbBkkYTnNyX1jD' });

		const { getByTestId, getAllByTestId } = renderModal({
			props: {
				data: {
					eventBus,
					status,
				},
			},
		});

		const submitButton = getByTestId('source-control-push-modal-submit');
		expect(submitButton).toBeDisabled();

		const files = getAllByTestId('source-control-push-modal-file-checkbox');
		expect(files).toHaveLength(2);

		await waitFor(() => expect(within(files[0]).getByRole('checkbox')).toBeChecked());
		expect(within(files[1]).getByRole('checkbox')).not.toBeChecked();

		await userEvent.type(getByTestId('source-control-push-modal-commit'), 'message');
		expect(submitButton).not.toBeDisabled();
	});

	describe('filters', () => {
		it('should filter by name', async () => {
			const status: SourceControlledFile[] = [
				{
					id: 'gTbbBkkYTnNyX1jD',
					name: 'My workflow 1',
					type: 'workflow',
					status: 'created',
					location: 'local',
					conflict: false,
					file: '/home/user/.n8n/git/workflows/gTbbBkkYTnNyX1jD.json',
					updatedAt: '2024-09-20T10:31:40.000Z',
				},
				{
					id: 'JIGKevgZagmJAnM6',
					name: 'My workflow 2',
					type: 'workflow',
					status: 'created',
					location: 'local',
					conflict: false,
					file: '/home/user/.n8n/git/workflows/JIGKevgZagmJAnM6.json',
					updatedAt: '2024-09-20T14:42:51.968Z',
				},
			];

			const { getByTestId, getAllByTestId } = renderModal({
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			expect(getAllByTestId('source-control-push-modal-file-checkbox')).toHaveLength(2);

			await userEvent.type(getByTestId('source-control-push-search'), '1');
			await waitFor(() =>
				expect(getAllByTestId('source-control-push-modal-file-checkbox')).toHaveLength(1),
			);
		});

		it('should filter by status', async () => {
			const status: SourceControlledFile[] = [
				{
					id: 'gTbbBkkYTnNyX1jD',
					name: 'Created Workflow',
					type: 'workflow',
					status: 'created',
					location: 'local',
					conflict: false,
					file: '/home/user/.n8n/git/workflows/gTbbBkkYTnNyX1jD.json',
					updatedAt: '2024-09-20T10:31:40.000Z',
				},
				{
					id: 'JIGKevgZagmJAnM6',
					name: 'Modified workflow',
					type: 'workflow',
					status: 'modified',
					location: 'local',
					conflict: false,
					file: '/home/user/.n8n/git/workflows/JIGKevgZagmJAnM6.json',
					updatedAt: '2024-09-20T14:42:51.968Z',
				},
			];

			const { getByTestId, getAllByTestId } = renderModal({
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			expect(getAllByTestId('source-control-push-modal-file-checkbox')).toHaveLength(2);

			await userEvent.click(getByTestId('source-control-filter-dropdown'));

			expect(getByTestId('source-control-status-filter')).toBeVisible();

			await userEvent.click(
				within(getByTestId('source-control-status-filter')).getByRole('combobox'),
			);

			await waitFor(() =>
				expect(getAllByTestId('source-control-status-filter-option')[0]).toBeVisible(),
			);

			const menu = getAllByTestId('source-control-status-filter-option')[0]
				.parentElement as HTMLElement;

			await userEvent.click(within(menu).getByText('New'));
			await waitFor(() => {
				const items = getAllByTestId('source-control-push-modal-file-checkbox');
				expect(items).toHaveLength(1);
				expect(items[0]).toHaveTextContent('Created Workflow');
			});
		});

		it('should reset', async () => {
			const status: SourceControlledFile[] = [
				{
					id: 'JIGKevgZagmJAnM6',
					name: 'Modified workflow',
					type: 'workflow',
					status: 'modified',
					location: 'local',
					conflict: false,
					file: '/home/user/.n8n/git/workflows/JIGKevgZagmJAnM6.json',
					updatedAt: '2024-09-20T14:42:51.968Z',
				},
			];

			const { getByTestId, getAllByTestId, queryAllByTestId } = renderModal({
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			expect(getAllByTestId('source-control-push-modal-file-checkbox')).toHaveLength(1);

			await userEvent.click(getByTestId('source-control-filter-dropdown'));

			expect(getByTestId('source-control-status-filter')).toBeVisible();

			await userEvent.click(
				within(getByTestId('source-control-status-filter')).getByRole('combobox'),
			);

			await waitFor(() =>
				expect(getAllByTestId('source-control-status-filter-option')[0]).toBeVisible(),
			);

			const menu = getAllByTestId('source-control-status-filter-option')[0]
				.parentElement as HTMLElement;

			await userEvent.click(within(menu).getByText('New'));
			await waitFor(() => {
				expect(queryAllByTestId('source-control-push-modal-file-checkbox')).toHaveLength(0);
				expect(getByTestId('source-control-filters-reset')).toBeInTheDocument();
			});

			await userEvent.click(getByTestId('source-control-filters-reset'));

			const items = getAllByTestId('source-control-push-modal-file-checkbox');
			expect(items).toHaveLength(1);
		});
	});
});
