import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import { vi } from 'vitest';
import DownloadDataTableModal from '@/features/core/dataTable/components/DownloadDataTableModal.vue';

const MODAL_NAME = 'download-data-table';

vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/design-system')>();
	return {
		...actual,
		N8nAlertDialog: {
			name: 'N8nAlertDialog',
			props: ['open', 'title', 'actionLabel', 'cancelLabel'],
			emits: ['action', 'cancel', 'update:open'],
			template: `
				<div v-if="open" role="dialog">
					<h2>{{ title }}</h2>
					<slot />
					<button type="button" data-test-id="download-modal-cancel" @click="$emit('cancel')">
						{{ cancelLabel }}
					</button>
					<button type="button" data-test-id="download-modal-confirm" @click="$emit('action')">
						{{ actionLabel }}
					</button>
				</div>
			`,
		},
	};
});

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
		modalName: MODAL_NAME,
	},
});

describe('DownloadDataTableModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function renderOpenModal() {
		const pinia = createTestingPinia({
			initialState: {
				[STORES.UI]: {
					modalStateById: {
						[MODAL_NAME]: { open: true },
					},
				},
			},
		});
		return renderComponent({ pinia });
	}

	it('should render the checkbox unchecked by default', () => {
		const { getByTestId } = renderOpenModal();
		expect(getByTestId('download-include-system-columns')).toBeInTheDocument();
	});

	it('should emit confirm with false when clicking confirm without toggling checkbox', async () => {
		const { getByTestId, emitted } = renderOpenModal();

		await userEvent.click(getByTestId('download-modal-confirm'));

		expect(emitted().confirm).toBeTruthy();
		expect(emitted().confirm[0]).toEqual([false]);
	});

	it('should emit confirm with true when checkbox is checked then confirm is clicked', async () => {
		const { getByTestId, emitted } = renderOpenModal();

		await userEvent.click(getByTestId('download-include-system-columns'));
		await userEvent.click(getByTestId('download-modal-confirm'));

		expect(emitted().confirm).toBeTruthy();
		expect(emitted().confirm[0]).toEqual([true]);
	});

	it('should emit close when cancel is clicked', async () => {
		const { getByTestId, emitted } = renderOpenModal();

		await userEvent.click(getByTestId('download-modal-cancel'));

		expect(emitted().close).toBeTruthy();
	});
});
