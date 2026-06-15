import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { vi } from 'vitest';
import DownloadDataTableModal from '@/features/core/dataTable/components/DownloadDataTableModal.vue';

const ModalStub = {
	template: `
		<div>
			<slot name="header" />
			<slot name="title" />
			<slot name="content" />
			<slot name="footer" />
		</div>
	`,
};

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => {
			if (key === 'dataTable.download.modal.title') return 'Download CSV';
			if (key === 'dataTable.download.modal.includeSystemColumns') return 'Include system columns';
			if (key === 'dataTable.download.modal.cancel') return 'Cancel';
			if (key === 'dataTable.download.modal.confirm') return 'Download';
			return key;
		},
	}),
}));

const renderComponent = createComponentRenderer(DownloadDataTableModal, {
	props: {
		modalName: 'download-data-table',
	},
	global: {
		stubs: {
			Modal: ModalStub,
		},
	},
});

describe('DownloadDataTableModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
	});

	it('should render the checkbox unchecked by default', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('download-include-system-columns')).toBeInTheDocument();
	});

	it('should emit confirm with false when clicking confirm without toggling checkbox', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('download-modal-confirm'));

		expect(emitted().confirm).toBeTruthy();
		expect(emitted().confirm[0]).toEqual([false]);
	});

	it('should emit confirm with true when checkbox is checked then confirm is clicked', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('download-include-system-columns'));
		await userEvent.click(getByTestId('download-modal-confirm'));

		expect(emitted().confirm).toBeTruthy();
		expect(emitted().confirm[0]).toEqual([true]);
	});

	it('should emit close when cancel is clicked', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('download-modal-cancel'));

		expect(emitted().close).toBeTruthy();
	});
});
