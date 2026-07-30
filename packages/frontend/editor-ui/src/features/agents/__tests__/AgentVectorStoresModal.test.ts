/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed, defineComponent } from 'vue';

import AgentVectorStoresModal from '../components/AgentVectorStoresModal.vue';

const closeModalMock = vi.fn();
const openNewCredentialMock = vi.fn();
const fetchAllCredentialsForWorkflowMock = vi.fn();
const testAgentVectorStoreMock = vi.fn();
const showMessageMock = vi.fn();
const showErrorMock = vi.fn();

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key}:${Object.values(options.interpolate).join(',')}` : key,
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@n8n/permissions', () => ({
	getResourcePermissions: () => ({ credential: { create: true } }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showMessage: showMessageMock, showError: showErrorMock }),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		closeModal: closeModalMock,
		openNewCredential: openNewCredentialMock,
		isModalActiveById: {},
	}),
}));

vi.mock('@/features/credentials/credentials.constants', () => ({
	CREDENTIAL_EDIT_MODAL_KEY: 'credentialEdit',
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		fetchAllCredentialsForWorkflow: fetchAllCredentialsForWorkflowMock,
		getCredentialTypeByName: () => undefined,
	}),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({ currentProject: null, personalProject: null, myProjects: [] }),
}));

vi.mock('../composables/useAgentApi', () => ({
	testAgentVectorStore: (...args: unknown[]) => testAgentVectorStoreMock(...args),
}));

vi.mock('@/app/components/Modal.vue', () => ({
	default: {
		name: 'Modal',
		props: ['name', 'width', 'customClass'],
		template:
			'<section><header><slot name="header" /></header><main><slot name="content" /></main><footer><slot name="footer" /></footer></section>',
	},
}));

vi.mock('@/features/credentials/components/CredentialIcon.vue', () => ({
	default: {
		name: 'CredentialIcon',
		props: ['credentialTypeName', 'size'],
		template: '<span />',
	},
}));

vi.mock('../components/AgentCredentialSelect.vue', () => ({
	default: {
		name: 'AgentCredentialSelect',
		props: [
			'modelValue',
			'credentials',
			'placeholder',
			'dataTestId',
			'credentialPermissions',
			'loading',
			'disabled',
			'size',
		],
		emits: ['update:modelValue', 'create'],
		template:
			'<select :data-test-id="dataTestId" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)">' +
			'<option value="" /><option v-for="c in credentials" :key="c.id" :value="c.id">{{ c.name }}</option>' +
			'</select>',
	},
}));

vi.mock('../components/EmbeddingModelSelector.vue', () => ({
	default: defineComponent({
		name: 'EmbeddingModelSelector',
		props: ['selectedModel', 'selectedCredentialId', 'credentialsByType', 'canCreateCredentials'],
		emits: ['update:selectedModel', 'update:selectedCredentialId', 'create-credential'],
		setup(props) {
			const allCredentials = computed<Array<{ id: string; name: string }>>(() =>
				Object.values(
					(props.credentialsByType ?? {}) as Record<string, Array<{ id: string; name: string }>>,
				).flat(),
			);
			return { allCredentials };
		},
		template:
			'<div>' +
			'<select data-testid="agent-vector-stores-modal-embedding-model" :value="selectedModel" ' +
			'@change="$emit(\'update:selectedModel\', $event.target.value)">' +
			'<option value="openai/text-embedding-3-small">openai/text-embedding-3-small</option>' +
			'</select>' +
			'<select data-testid="agent-vector-stores-modal-embedding-credential" :value="selectedCredentialId" ' +
			'@change="$emit(\'update:selectedCredentialId\', $event.target.value)">' +
			'<option value="" /><option v-for="c in allCredentials" :key="c.id" :value="c.id">{{ c.name }}</option>' +
			'</select>' +
			'</div>',
	}),
}));

const qdrantCredential = { id: 'qdrant-cred-1', name: 'My Qdrant', type: 'qdrantApi' };
const openAiCredential = { id: 'openai-cred-1', name: 'My OpenAI', type: 'openAiApi' };

async function selectQdrantProvider(wrapper: ReturnType<typeof mount>) {
	await wrapper.findAll('[data-testid="agent-vector-stores-modal-connect"]')[2].trigger('click');
}

async function fillQdrantConnection(wrapper: ReturnType<typeof mount>) {
	await wrapper
		.find('[data-testid="agent-vector-stores-modal-name"] input')
		.setValue('product_docs');
	await wrapper
		.find('[data-testid="agent-vector-stores-modal-collection-name"] input')
		.setValue('docs');
	await wrapper
		.find('[data-test-id="agent-vector-stores-modal-credential"]')
		.setValue('qdrant-cred-1');
	await wrapper
		.find('[data-testid="agent-vector-stores-modal-embedding-model"]')
		.setValue('openai/text-embedding-3-small');
	await wrapper
		.find('[data-testid="agent-vector-stores-modal-embedding-credential"]')
		.setValue('openai-cred-1');
	await wrapper
		.find('[data-testid="agent-vector-stores-modal-use-when"] input')
		.setValue('Search product docs.');
}

const expectedVectorStore = {
	provider: 'qdrant',
	name: 'product_docs',
	credential: 'qdrant-cred-1',
	useWhen: 'Search product docs.',
	embedding: { model: 'openai/text-embedding-3-small', credential: 'openai-cred-1' },
	collectionName: 'docs',
};

describe('AgentVectorStoresModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchAllCredentialsForWorkflowMock.mockResolvedValue([qdrantCredential, openAiCredential]);
	});

	it('lists all four vector store providers with a Connect button each', async () => {
		const wrapper = mount(AgentVectorStoresModal, {
			props: {
				modalName: 'agentVectorStoresModal',
				data: { projectId: 'p1', agentId: 'a1', existingNames: [], onConfirm: vi.fn() },
			},
		});
		await flushPromises();

		const rows = wrapper.findAll('[data-testid="agent-vector-stores-modal-row"]');
		expect(rows).toHaveLength(4);
		const rowTexts = rows.map((row) => row.text());
		for (const displayName of ['Pinecone', 'Supabase', 'Qdrant', 'Postgres']) {
			expect(rowTexts.some((text) => text.includes(displayName))).toBe(true);
		}
		expect(wrapper.findAll('[data-testid="agent-vector-stores-modal-connect"]')).toHaveLength(4);
	});

	it('does not show the useWhen validation error until the field is touched', async () => {
		const wrapper = mount(AgentVectorStoresModal, {
			props: {
				modalName: 'agentVectorStoresModal',
				data: { projectId: 'p1', agentId: 'a1', existingNames: [], onConfirm: vi.fn() },
			},
		});
		await flushPromises();
		await selectQdrantProvider(wrapper);

		const useWhenBlock = wrapper.find('[data-testid="agent-vector-stores-modal-use-when"]');
		const useWhenInput = useWhenBlock.find('input');
		expect(useWhenBlock.text()).not.toMatch(/required/i);

		await useWhenInput.setValue('Search docs.');
		await useWhenInput.setValue('');
		await useWhenInput.trigger('blur');

		expect(useWhenBlock.text()).toMatch(/required/i);
	});

	it('disables Connect until required fields are filled, then tests and confirms', async () => {
		testAgentVectorStoreMock.mockResolvedValue({ success: true });
		const onConfirm = vi.fn();

		const wrapper = mount(AgentVectorStoresModal, {
			props: {
				modalName: 'agentVectorStoresModal',
				data: { projectId: 'p1', agentId: 'a1', existingNames: [], onConfirm },
			},
		});
		await flushPromises();

		await selectQdrantProvider(wrapper);
		const confirmButton = wrapper.find('[data-testid="agent-vector-stores-modal-confirm"]');
		expect(confirmButton.attributes('disabled')).toBeDefined();

		await fillQdrantConnection(wrapper);
		expect(confirmButton.attributes('disabled')).toBeUndefined();

		await confirmButton.trigger('click');
		await flushPromises();

		expect(testAgentVectorStoreMock).toHaveBeenCalledWith({}, 'p1', expectedVectorStore);
		expect(onConfirm).toHaveBeenCalledWith(expectedVectorStore);
		expect(closeModalMock).toHaveBeenCalledWith('agentVectorStoresModal');
		expect(showMessageMock).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'success', title: expect.stringContaining('product_docs') }),
		);
		expect(showErrorMock).not.toHaveBeenCalled();
	});

	it('shows a warning toast alongside a successful connection test, and still confirms', async () => {
		testAgentVectorStoreMock.mockResolvedValue({
			success: true,
			warning:
				'Namespace "staging" has no data yet in index "product-docs". It will appear once data is indexed — double-check the name if you expected existing data.',
		});
		const onConfirm = vi.fn();

		const wrapper = mount(AgentVectorStoresModal, {
			props: {
				modalName: 'agentVectorStoresModal',
				data: { projectId: 'p1', agentId: 'a1', existingNames: [], onConfirm },
			},
		});
		await flushPromises();

		await selectQdrantProvider(wrapper);
		await fillQdrantConnection(wrapper);

		await wrapper.find('[data-testid="agent-vector-stores-modal-confirm"]').trigger('click');
		await flushPromises();

		expect(onConfirm).toHaveBeenCalledWith(expectedVectorStore);
		expect(closeModalMock).toHaveBeenCalledWith('agentVectorStoresModal');
		expect(showMessageMock).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'warning',
				message:
					'Namespace "staging" has no data yet in index "product-docs". It will appear once data is indexed — double-check the name if you expected existing data.',
			}),
		);
		expect(showErrorMock).not.toHaveBeenCalled();
	});

	it('shows a toast with the failure message from a failed connection test and does not confirm', async () => {
		testAgentVectorStoreMock.mockResolvedValue({
			success: false,
			message:
				'Collection "docs" expects 1536 dimensions but model "openai/text-embedding-3-small" produces 3072.',
		});
		const onConfirm = vi.fn();

		const wrapper = mount(AgentVectorStoresModal, {
			props: {
				modalName: 'agentVectorStoresModal',
				data: { projectId: 'p1', agentId: 'a1', existingNames: [], onConfirm },
			},
		});
		await flushPromises();
		await selectQdrantProvider(wrapper);
		await fillQdrantConnection(wrapper);

		await wrapper.find('[data-testid="agent-vector-stores-modal-confirm"]').trigger('click');
		await flushPromises();

		expect(showMessageMock).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'error',
				message:
					'Collection "docs" expects 1536 dimensions but model "openai/text-embedding-3-small" produces 3072.',
			}),
		);
		expect(onConfirm).not.toHaveBeenCalled();
		expect(closeModalMock).not.toHaveBeenCalled();
	});

	it('shows an error toast when the test request throws', async () => {
		testAgentVectorStoreMock.mockRejectedValue(new Error('Network error'));
		const onConfirm = vi.fn();

		const wrapper = mount(AgentVectorStoresModal, {
			props: {
				modalName: 'agentVectorStoresModal',
				data: { projectId: 'p1', agentId: 'a1', existingNames: [], onConfirm },
			},
		});
		await flushPromises();
		await selectQdrantProvider(wrapper);
		await fillQdrantConnection(wrapper);

		await wrapper.find('[data-testid="agent-vector-stores-modal-confirm"]').trigger('click');
		await flushPromises();

		expect(showErrorMock).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
		expect(onConfirm).not.toHaveBeenCalled();
		expect(closeModalMock).not.toHaveBeenCalled();
	});

	it('renders an edit-mode config with an unrecognized embedding provider without throwing', async () => {
		const vectorStore = {
			provider: 'qdrant' as const,
			name: 'product_docs',
			credential: 'qdrant-cred-1',
			useWhen: 'Search product docs.',
			embedding: { model: 'voyage/voyage-2', credential: 'embed-cred' },
			collectionName: 'docs',
		};

		const wrapper = mount(AgentVectorStoresModal, {
			props: {
				modalName: 'agentVectorStoresModal',
				data: {
					projectId: 'p1',
					agentId: 'a1',
					existingNames: [],
					vectorStore,
					onConfirm: vi.fn(),
				},
			},
		});
		await flushPromises();

		expect(wrapper.find('[data-testid="agent-vector-stores-modal-name"]').exists()).toBe(true);
	});

	it('clears provider-specific fields when going back to the provider picker', async () => {
		const pineconeCredential = { id: 'pinecone-cred-1', name: 'My Pinecone', type: 'pineconeApi' };
		fetchAllCredentialsForWorkflowMock.mockResolvedValue([
			pineconeCredential,
			qdrantCredential,
			openAiCredential,
		]);

		const wrapper = mount(AgentVectorStoresModal, {
			props: {
				modalName: 'agentVectorStoresModal',
				data: { projectId: 'p1', agentId: 'a1', existingNames: [], onConfirm: vi.fn() },
			},
		});
		await flushPromises();

		// Configure Pinecone (first provider row): locator prefills the name.
		await wrapper.findAll('[data-testid="agent-vector-stores-modal-connect"]')[0].trigger('click');
		await wrapper
			.find('[data-testid="agent-vector-stores-modal-index-name"] input')
			.setValue('docs-index');
		await wrapper
			.find('[data-test-id="agent-vector-stores-modal-credential"]')
			.setValue('pinecone-cred-1');

		// Back to the picker, then pick Qdrant instead.
		await wrapper.find('[data-testid="agent-vector-stores-modal-back"]').trigger('click');
		await wrapper.findAll('[data-testid="agent-vector-stores-modal-connect"]')[2].trigger('click');

		// Pinecone leftovers must be gone.
		const nameInput = wrapper.find<HTMLInputElement>(
			'[data-testid="agent-vector-stores-modal-name"] input',
		);
		expect(nameInput.element.value).toBe('');
		const credentialSelect = wrapper.find<HTMLSelectElement>(
			'[data-test-id="agent-vector-stores-modal-credential"]',
		);
		expect(credentialSelect.element.value).toBe('');

		// Returning to Pinecone must not resurrect the old index name.
		await wrapper.find('[data-testid="agent-vector-stores-modal-back"]').trigger('click');
		await wrapper.findAll('[data-testid="agent-vector-stores-modal-connect"]')[0].trigger('click');
		const indexInput = wrapper.find<HTMLInputElement>(
			'[data-testid="agent-vector-stores-modal-index-name"] input',
		);
		expect(indexInput.element.value).toBe('');
	});
});
