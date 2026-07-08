/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
	default: {
		name: 'EmbeddingModelSelector',
		props: ['selectedModel', 'selectedCredentialId', 'credentialsByType', 'canCreateCredentials'],
		emits: ['update:selectedModel', 'update:selectedCredentialId', 'create-credential'],
		computed: {
			allCredentials(): Array<{ id: string; name: string }> {
				return Object.values(this.credentialsByType ?? {}).flat();
			},
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
	},
}));

vi.mock('@n8n/design-system', () => ({
	N8nButton: {
		props: ['variant', 'size', 'disabled', 'loading'],
		emits: ['click'],
		template:
			'<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
	},
	N8nFormInput: {
		inheritAttrs: false,
		props: {
			modelValue: { type: String, default: '' },
			label: { type: String, default: '' },
			placeholder: { type: String, default: '' },
			required: { type: Boolean, default: false },
			maxlength: { type: Number, default: undefined },
			validationRules: { type: Array, default: () => [] },
			validators: { type: Object, default: () => ({}) },
		},
		emits: ['update:modelValue', 'validate'],
		data() {
			return { hasBlurred: false };
		},
		computed: {
			errorMessage(): string {
				const value = typeof this.modelValue === 'string' ? this.modelValue.trim() : '';
				if (this.required && !value) return 'required';
				for (const rule of this.validationRules ?? []) {
					if (rule.name === 'MAX_LENGTH' && value.length > rule.config.maximum) return 'maxLength';
					if (rule.name === 'MATCH_REGEX' && !rule.config.regex.test(value)) {
						return rule.config.message;
					}
					if (rule.name === 'NAME_UNIQUE' && this.validators?.NAME_UNIQUE) {
						const result = this.validators.NAME_UNIQUE.validate(value);
						if (result) return result.message;
					}
				}
				return '';
			},
		},
		watch: {
			errorMessage: {
				immediate: true,
				handler(message: string) {
					this.$emit('validate', !message);
				},
			},
		},
		template:
			'<div>' +
			'<label v-if="label">{{ label }}</label>' +
			'<input v-bind="$attrs" :value="modelValue" :placeholder="placeholder" :maxlength="maxlength" ' +
			'@input="$emit(\'update:modelValue\', $event.target.value)" @blur="hasBlurred = true" />' +
			'<span v-if="hasBlurred && errorMessage">{{ errorMessage }}</span>' +
			'</div>',
	},
	N8nHeading: { template: '<h2><slot /></h2>', props: ['tag', 'size'] },
	N8nInputLabel: {
		props: ['label', 'tooltipText', 'required'],
		template: '<div><label>{{ label }}</label><slot /></div>',
	},
	N8nText: { template: '<span><slot /></span>', props: ['size', 'color', 'bold'] },
}));

const qdrantCredential = { id: 'qdrant-cred-1', name: 'My Qdrant', type: 'qdrantApi' };
const openAiCredential = { id: 'openai-cred-1', name: 'My OpenAI', type: 'openAiApi' };

async function selectQdrantProvider(wrapper: ReturnType<typeof mount>) {
	await wrapper.findAll('[data-testid="agent-vector-stores-modal-connect"]')[2].trigger('click');
}

async function fillQdrantConnection(wrapper: ReturnType<typeof mount>) {
	await wrapper.find('[data-testid="agent-vector-stores-modal-name"]').setValue('product_docs');
	await wrapper.find('[data-testid="agent-vector-stores-modal-collection-name"]').setValue('docs');
	await wrapper
		.find('[data-test-id="agent-vector-stores-modal-credential"]')
		.setValue('qdrant-cred-1');
	await wrapper
		.find('[data-testid="agent-vector-stores-modal-embedding-credential"]')
		.setValue('openai-cred-1');
	await wrapper
		.find('[data-testid="agent-vector-stores-modal-use-when"]')
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

		const useWhenInput = wrapper.find('[data-testid="agent-vector-stores-modal-use-when"]');
		expect(useWhenInput.text()).toBe('');
		expect(wrapper.text()).not.toContain('required');

		await useWhenInput.setValue('Search docs.');
		await useWhenInput.setValue('');
		await useWhenInput.trigger('blur');

		expect(wrapper.text()).toContain('required');
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

		expect(testAgentVectorStoreMock).toHaveBeenCalledWith({}, 'p1', 'a1', expectedVectorStore);
		expect(onConfirm).toHaveBeenCalledWith(expectedVectorStore);
		expect(closeModalMock).toHaveBeenCalledWith('agentVectorStoresModal');
		expect(showMessageMock).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'success', title: expect.stringContaining('product_docs') }),
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
});
