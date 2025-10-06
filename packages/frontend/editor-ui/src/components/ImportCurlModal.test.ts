import { createComponentRenderer } from '@/__tests__/render';
import ImportCurlModal from './ImportCurlModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { IMPORT_CURL_MODAL_KEY } from '@/constants';
import { mockedStore } from '@/__tests__/utils';
import { nextTick } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import { useNDVStore } from '@/stores/ndv.store';
import userEvent from '@testing-library/user-event';

const mockTelemetryTrack = vi.fn();
vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: mockTelemetryTrack,
	}),
}));

vi.mock('@/composables/useImportCurlCommand', () => ({
	useImportCurlCommand: (options: {
		onImportSuccess: () => void;
		onAfterImport: () => void;
	}) => ({
		importCurlCommand: () => {
			options.onImportSuccess();
			options.onAfterImport();
		},
	}),
}));

const renderModal = createComponentRenderer(ImportCurlModal, {
	pinia: createTestingPinia(),
});

const testNode = {
	id: 'node-1',
	name: 'HTTP Request',
	type: 'n8n-nodes-base.httpRequest',
	position: [0, 0] as [number, number],
	typeVersion: 1,
	parameters: {},
};

describe('ImportCurlModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should show empty input when no curl command exists for active node', async () => {
		const uiStore = mockedStore(useUIStore);
		uiStore.modalsById = {
			[IMPORT_CURL_MODAL_KEY]: {
				open: true,
				data: {
					curlCommands: {
						'node-2': 'curl -X GET https://api.example.com/data',
					},
				},
			},
		};
		uiStore.modalStack = [IMPORT_CURL_MODAL_KEY];
		const ndvStore = mockedStore(useNDVStore);
		ndvStore.activeNode = testNode;

		const { getByTestId } = renderModal();
		await nextTick();

		const input = getByTestId('import-curl-modal-input');
		expect(input).toHaveValue('');
	});

	it('should show curl command for active node', async () => {
		const uiStore = mockedStore(useUIStore);
		uiStore.modalsById = {
			[IMPORT_CURL_MODAL_KEY]: {
				open: true,
				data: {
					curlCommands: {
						'node-1': 'curl -X GET https://api.example.com/data',
						'node-2': 'curl -X POST https://api.example.com/submit',
					},
				},
			},
		};
		uiStore.modalStack = [IMPORT_CURL_MODAL_KEY];
		const ndvStore = mockedStore(useNDVStore);
		ndvStore.activeNode = testNode;

		const { getByTestId } = renderModal();
		await nextTick();

		const input = getByTestId('import-curl-modal-input');
		expect(input).toHaveValue('curl -X GET https://api.example.com/data');
	});

	it('should set the input value when the import button is clicked', async () => {
		const uiStore = mockedStore(useUIStore);
		uiStore.modalsById = {
			[IMPORT_CURL_MODAL_KEY]: {
				open: true,
				data: {
					curlCommands: {
						'node-2': 'curl -X POST https://api.example.com/submit',
					},
				},
			},
		};
		uiStore.modalStack = [IMPORT_CURL_MODAL_KEY];
		const ndvStore = mockedStore(useNDVStore);
		ndvStore.activeNode = testNode;

		const { getByTestId } = renderModal();
		await nextTick();

		const input = getByTestId('import-curl-modal-input');
		await userEvent.type(input, 'curl -X GET https://api.example.com/data');
		const button = getByTestId('import-curl-modal-button');
		await userEvent.click(button);
		expect(uiStore.modalsById[IMPORT_CURL_MODAL_KEY].data?.curlCommands).toEqual({
			'node-1': 'curl -X GET https://api.example.com/data',
			'node-2': 'curl -X POST https://api.example.com/submit',
		});
	});

	it('should override the input value when the import button is clicked', async () => {
		const uiStore = mockedStore(useUIStore);
		uiStore.modalsById = {
			[IMPORT_CURL_MODAL_KEY]: {
				open: true,
				data: {
					curlCommands: {
						'node-1': 'curl -X GET https://api.example.com/data',
					},
				},
			},
		};
		uiStore.modalStack = [IMPORT_CURL_MODAL_KEY];
		const ndvStore = mockedStore(useNDVStore);
		ndvStore.activeNode = testNode;

		const { getByTestId } = renderModal();
		await nextTick();

		const input = getByTestId('import-curl-modal-input');
		await userEvent.clear(input);
		await userEvent.type(input, 'curl -X GET https://api.example.com/other');
		const button = getByTestId('import-curl-modal-button');
		await userEvent.click(button);
		expect(uiStore.modalsById[IMPORT_CURL_MODAL_KEY].data?.curlCommands).toEqual({
			'node-1': 'curl -X GET https://api.example.com/other',
		});
	});
});
