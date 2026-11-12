import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import { createEventBus } from '@n8n/utils/event-bus';
import { STORES } from '@n8n/stores';
import { createComponentRenderer } from '@/__tests__/render';
import { EXTERNAL_SECRETS_PROVIDER_MODAL_KEY, MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useExternalSecretsStore } from '@/features/integrations/externalSecrets.ee/externalSecrets.ee.store';
import type { ExternalSecretsProvider } from '../externalSecrets.types';
import ExternalSecretsProviderModal from './ExternalSecretsProviderModal.ee.vue';

const confirmMock = vi.hoisted(() => vi.fn());

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({
		confirm: confirmMock,
	}),
}));

const savedProvider: ExternalSecretsProvider = {
	icon: 'vault',
	name: 'vault',
	displayName: 'HashiCorp Vault',
	connected: true,
	connectedAt: '2024-01-15T10:00:00.000Z',
	state: 'connected',
	data: { token: 'saved-token' },
	properties: [
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			default: '',
		},
	],
};

const DialogStub = {
	props: ['open'],
	emits: ['update:open'],
	template: `
		<div role="dialog" :data-open="String(open === true)">
			<button type="button" data-test-id="stub-dialog-request-close" @click="$emit('update:open', false)"></button>
			<slot />
		</div>
	`,
};

const dialogPartStub = { template: '<div><slot /></div>' };

const renderModal = createComponentRenderer(ExternalSecretsProviderModal, {
	global: {
		stubs: {
			Dialog: DialogStub,
			DialogHeader: dialogPartStub,
			DialogTitle: dialogPartStub,
			DialogBody: dialogPartStub,
			DialogClose: dialogPartStub,
			ExternalSecretsProviderImage: true,
			ExternalSecretsProviderConnectionSwitch: true,
			ParameterInputExpanded: {
				props: ['parameter'],
				emits: ['update'],
				template:
					'<button type="button" data-test-id="change-provider-field" @click="$emit(\'update\', { name: parameter.name, value: \'edited-token\' })"></button>',
			},
		},
	},
});

function renderOpenModal() {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalStateById: {
					[EXTERNAL_SECRETS_PROVIDER_MODAL_KEY]: { open: true },
				},
			},
		},
	});
	const externalSecretsStore = useExternalSecretsStore();
	externalSecretsStore.state.providers = [savedProvider];
	vi.mocked(externalSecretsStore.getProvider).mockResolvedValue(savedProvider);

	return renderModal({
		pinia,
		props: {
			data: {
				name: savedProvider.name,
				eventBus: createEventBus(),
			},
		},
	});
}

describe('ExternalSecretsProviderModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	async function editAndRequestClose() {
		const rendered = renderOpenModal();
		await flushPromises();
		await userEvent.click(rendered.getByTestId('change-provider-field'));
		await userEvent.click(rendered.getByTestId('stub-dialog-request-close'));
		await flushPromises();
		return rendered;
	}

	it('keeps the dialog open when the user keeps editing unsaved changes', async () => {
		confirmMock.mockResolvedValue(MODAL_CONFIRM);

		await editAndRequestClose();

		expect(confirmMock).toHaveBeenCalled();
		expect(useUIStore().closeModal).not.toHaveBeenCalled();
	});

	it('closes the dialog when the user discards unsaved changes', async () => {
		confirmMock.mockResolvedValue(MODAL_CANCEL);

		await editAndRequestClose();

		expect(confirmMock).toHaveBeenCalled();
		expect(useUIStore().closeModal).toHaveBeenCalledWith(EXTERNAL_SECRETS_PROVIDER_MODAL_KEY);
	});
});
