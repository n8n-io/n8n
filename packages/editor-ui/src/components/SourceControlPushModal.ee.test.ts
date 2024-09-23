import { within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { useRoute } from 'vue-router';
import { createComponentRenderer } from '@/__tests__/render';
import SourceControlPushModal from '@/components/SourceControlPushModal.ee.vue';
import { createTestingPinia } from '@pinia/testing';
import { createEventBus } from 'n8n-design-system';
import type { SourceControlAggregatedFile } from '@/Interface';

const eventBus = createEventBus();

vi.mock('vue-router', () => ({
	useRoute: vi.fn().mockReturnValue({
		params: vi.fn(),
		fullPath: vi.fn(),
	}),
	RouterLink: vi.fn(),
}));

let route: ReturnType<typeof useRoute>;

const renderModal = createComponentRenderer(SourceControlPushModal, {
	global: {
		stubs: {
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
	});

	it('mounts', () => {
		vi.spyOn(route, 'fullPath', 'get').mockReturnValue('');

		const { getByTitle } = renderModal({
			pinia: createTestingPinia(),
			props: {
				data: {
					eventBus,
					status: [],
				},
			},
		});
		expect(getByTitle('Commit and push changes')).toBeInTheDocument();
	});

	it('should toggle checkboxes', async () => {
		const status: SourceControlAggregatedFile[] = [
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

		vi.spyOn(route, 'fullPath', 'get').mockReturnValue('/home/workflows');

		const { getByTestId, getAllByTestId } = renderModal({
			pinia: createTestingPinia(),
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
});
