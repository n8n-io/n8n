import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import SetupWorkflowCredentialsModal from './SetupWorkflowCredentialsModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { ref } from 'vue';

const mockSetInitialCredentialSelection = vi.fn();
const mockSetCredential = vi.fn();
const mockUnsetCredential = vi.fn();
const mockAppCredentials = ref([]);
const mockCredentialUsages = ref<
	Array<{ key: string; credentialType: string; credentialName: string }>
>([]);
const mockNumFilledCredentials = ref(0);
const mockSelectedCredentialIdByKey = ref({});

vi.mock('../composables/useSetupWorkflowCredentialsModalState', () => ({
	useSetupWorkflowCredentialsModalState: () => ({
		appCredentials: mockAppCredentials,
		credentialUsages: mockCredentialUsages,
		numFilledCredentials: mockNumFilledCredentials,
		selectedCredentialIdByKey: mockSelectedCredentialIdByKey,
		setInitialCredentialSelection: mockSetInitialCredentialSelection,
		setCredential: mockSetCredential,
		unsetCredential: mockUnsetCredential,
	}),
}));

const mockTelemetryTrack = vi.fn();

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: mockTelemetryTrack,
	}),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

// Mock the Modal component to always render its slots
vi.mock('@/app/components/Modal.vue', () => ({
	default: {
		template: `
			<div data-test-id="modal">
				<slot name="header" />
				<slot name="content" />
				<slot name="footer" />
			</div>
		`,
		props: ['name', 'width', 'maxHeight'],
	},
}));

vi.mock('./AppsRequiringCredsNotice.vue', () => ({
	default: {
		template: '<div data-test-id="apps-requiring-creds-notice" />',
		props: ['appCredentials', 'source'],
	},
}));

vi.mock('./SetupTemplateFormStep.vue', () => ({
	default: {
		template:
			'<li data-test-id="setup-template-form-step" @credential-selected="$emit(\'credentialSelected\', $event)" @credential-deselected="$emit(\'credentialDeselected\', $event)" />',
		props: ['order', 'credentials', 'selectedCredentialId', 'source'],
		emits: ['credentialSelected', 'credentialDeselected'],
	},
}));

let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;

const MODAL_NAME = 'setupCredentialsModal';

const renderComponent = createComponentRenderer(SetupWorkflowCredentialsModal);

describe('SetupWorkflowCredentialsModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAppCredentials.value = [];
		mockCredentialUsages.value = [];
		mockNumFilledCredentials.value = 0;
		mockSelectedCredentialIdByKey.value = {};

		createTestingPinia();
		workflowsStore = mockedStore(useWorkflowsStore);
		uiStore = mockedStore(useUIStore);
		workflowsStore.workflowId = 'test-workflow-id';
	});

	it('renders with default title for template source', () => {
		const { getByText } = renderComponent({
			props: {
				modalName: MODAL_NAME,
				data: { source: 'template' },
			},
		});

		expect(getByText('setupCredentialsModal.title')).toBeInTheDocument();
	});

	it('renders with builder title for builder source', () => {
		const { getByText } = renderComponent({
			props: {
				modalName: MODAL_NAME,
				data: { source: 'builder' },
			},
		});

		expect(getByText('setupCredentialsModal.title.builder')).toBeInTheDocument();
	});

	it('calls setInitialCredentialSelection and tracks telemetry on mount', () => {
		renderComponent({
			props: {
				modalName: MODAL_NAME,
				data: { source: 'template' },
			},
		});

		expect(mockSetInitialCredentialSelection).toHaveBeenCalled();
		expect(mockTelemetryTrack).toHaveBeenCalledWith('User opened cred setup', {
			source: 'template',
		});
	});

	it('tracks telemetry on unmount with completion status', () => {
		mockCredentialUsages.value = [
			{ key: 'cred1', credentialType: 'openAiApi', credentialName: '' },
			{ key: 'cred2', credentialType: 'slackApi', credentialName: '' },
		];
		mockNumFilledCredentials.value = 2;

		const { unmount } = renderComponent({
			props: {
				modalName: MODAL_NAME,
				data: { source: 'template' },
			},
		});

		unmount();

		expect(mockTelemetryTrack).toHaveBeenCalledWith('User closed cred setup', {
			completed: true,
			creds_filled: 2,
			creds_needed: 2,
			source: 'template',
			workflow_id: 'test-workflow-id',
		});
	});

	it('tracks incomplete status when not all credentials are filled', () => {
		mockCredentialUsages.value = [
			{ key: 'cred1', credentialType: 'openAiApi', credentialName: '' },
			{ key: 'cred2', credentialType: 'slackApi', credentialName: '' },
		];
		mockNumFilledCredentials.value = 1;

		const { unmount } = renderComponent({
			props: {
				modalName: MODAL_NAME,
				data: { source: 'template' },
			},
		});

		unmount();

		expect(mockTelemetryTrack).toHaveBeenCalledWith('User closed cred setup', {
			completed: false,
			creds_filled: 1,
			creds_needed: 2,
			source: 'template',
			workflow_id: 'test-workflow-id',
		});
	});

	it('disables continue button when no credentials are filled', () => {
		mockNumFilledCredentials.value = 0;

		const { getByTestId } = renderComponent({
			props: {
				modalName: MODAL_NAME,
				data: { source: 'template' },
			},
		});

		const button = getByTestId('continue-button') as HTMLButtonElement;
		expect(button.disabled).toBe(true);
	});

	it('enables continue button when at least one credential is filled', () => {
		mockNumFilledCredentials.value = 1;

		const { getByTestId } = renderComponent({
			props: {
				modalName: MODAL_NAME,
				data: { source: 'template' },
			},
		});

		const button = getByTestId('continue-button') as HTMLButtonElement;
		expect(button.disabled).toBe(false);
	});

	it('closes modal when continue button is clicked', () => {
		mockNumFilledCredentials.value = 1;

		const { getByTestId } = renderComponent({
			props: {
				modalName: MODAL_NAME,
				data: { source: 'template' },
			},
		});

		const button = getByTestId('continue-button');
		button.click();

		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});
});
