import { createComponentRenderer } from '@/__tests__/render';
import ImportCurlModal from './ImportCurlModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { IMPORT_CURL_MODAL_KEY } from '@/app/constants';
import { mockedStore } from '@/__tests__/utils';
import { nextTick } from 'vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import userEvent from '@testing-library/user-event';

const mockTelemetryTrack = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: mockTelemetryTrack,
	}),
}));

const mockShowToast = vi.fn();
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showToast: mockShowToast }),
}));

const mockImportCurlCommand = vi.fn();
let mockImportOptions: {
	onImportSuccess: () => void;
	onImportFailure: (data: { invalidProtocol: boolean; protocol?: string }) => void;
	onAfterImport: () => void;
};

vi.mock('@/app/composables/useImportCurlCommand', () => ({
	useImportCurlCommand: (options: typeof mockImportOptions) => {
		mockImportOptions = options;
		return { importCurlCommand: mockImportCurlCommand };
	},
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
		mockImportCurlCommand.mockImplementation(() => {
			mockImportOptions.onImportSuccess();
			mockImportOptions.onAfterImport();
		});
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

	it('should show error toast and track failure telemetry when import throws (e.g. WASM load failure)', async () => {
		mockImportCurlCommand.mockImplementation(() => {
			throw new Error('WASM failed to load');
		});

		const uiStore = mockedStore(useUIStore);
		uiStore.modalsById = {
			[IMPORT_CURL_MODAL_KEY]: {
				open: true,
				data: { curlCommands: {} },
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

		expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
		expect(mockTelemetryTrack).toHaveBeenCalledWith(
			'User imported curl command',
			expect.objectContaining({ success: false }),
		);
	});
});
