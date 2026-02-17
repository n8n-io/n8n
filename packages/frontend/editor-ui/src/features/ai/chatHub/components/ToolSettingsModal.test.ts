import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderComponent } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import ToolSettingsModal from './ToolSettingsModal.vue';
import type { INode } from 'n8n-workflow';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { defineComponent, onMounted, ref } from 'vue';

vi.mock('@n8n/i18n', () => {
	const i18n = {
		baseText: (key: string) => key,
		nodeText: () => ({
			topParameterPanel: () => '',
			inputLabelDisplayName: (parameter: { displayName: string }) => parameter.displayName,
			inputLabelDescription: (parameter: { description?: string }) => parameter.description,
			placeholder: (parameter: { placeholder?: string }) => parameter.placeholder,
			hint: (parameter: { hint?: string }) => parameter.hint,
			optionsOptionName: (parameter: { name: string }) => parameter.name,
			optionsOptionDescription: (parameter: { description?: string }) => parameter.description,
			collectionOptionName: (parameter: { displayName: string }) => parameter.displayName,
			credentialsSelectAuthDisplayName: (parameter: { displayName: string }) =>
				parameter.displayName,
			credentialsSelectAuthDescription: (parameter: { description?: string }) =>
				parameter.description,
		}),
	};
	return {
		useI18n: () => i18n,
		i18n,
		i18nInstance: { install: vi.fn() },
	};
});

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn(), resolve: vi.fn(() => ({ href: '' })) }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: { template: '<a><slot /></a>' },
}));

function createMockNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'test-node-id',
		name: 'Test Tool',
		type: 'n8n-nodes-base.testTool',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	};
}

function createToolSettingsStub(emitValid: boolean) {
	return defineComponent({
		props: ['initialNode', 'existingToolNames'],
		emits: ['update:valid', 'update:node-name'],
		setup(props, { emit, expose }) {
			expose({
				node: ref(props.initialNode),
				handleChangeName: vi.fn(),
				nodeTypeDescription: ref(null),
			});
			onMounted(() => {
				emit('update:valid', emitValid);
				emit('update:node-name', props.initialNode?.name ?? '');
			});
			return {};
		},
		template: '<div data-test-id="tool-settings-content" />',
	});
}

const sharedStubs = {
	DialogPortal: { template: '<div><slot /></div>' },
	DialogOverlay: { template: '<div />' },
	NodeIcon: { template: '<div />' },
};

const MODAL_NAME = 'ToolSettingsModal';
const onConfirmMock = vi.fn();

function renderModal({ valid = false, node = createMockNode() as INode | null } = {}) {
	return renderComponent(ToolSettingsModal, {
		props: {
			modalName: MODAL_NAME,
			data: {
				node,
				existingToolNames: [],
				onConfirm: onConfirmMock,
			},
		},
		global: {
			stubs: {
				...sharedStubs,
				ToolSettingsContent: createToolSettingsStub(valid),
			},
		},
	});
}

describe('ToolSettingsModal', () => {
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;

	beforeEach(() => {
		vi.clearAllMocks();

		createTestingPinia({ stubActions: false });

		uiStore = mockedStore(useUIStore);
		uiStore.closeModal = vi.fn();
	});

	it('should render dialog when node is provided', () => {
		const { getByTestId, getByText } = renderModal();

		expect(getByTestId('tool-settings-content')).toBeTruthy();
		expect(getByText('chatHub.toolSettings.cancel')).toBeTruthy();
		expect(getByText('chatHub.toolSettings.confirm')).toBeTruthy();
	});

	it('should not render dialog when node is null', () => {
		const { queryByTestId } = renderModal({ node: null });

		expect(queryByTestId('tool-settings-content')).toBeNull();
	});

	it('should display node name in header', async () => {
		const { getByTitle } = renderModal({ node: createMockNode({ name: 'My Custom Tool' }) });

		await waitFor(() => {
			expect(getByTitle('My Custom Tool')).toBeTruthy();
		});
	});

	it('should disable confirm button when content is not valid', () => {
		const { getByText } = renderModal({ valid: false });

		const confirmButton = getByText('chatHub.toolSettings.confirm').closest('button');
		expect(confirmButton).toBeTruthy();
		expect(confirmButton?.disabled).toBe(true);
	});

	it('should enable confirm button when content is valid', async () => {
		const { getByText } = renderModal({ valid: true });

		await waitFor(() => {
			const confirmButton = getByText('chatHub.toolSettings.confirm').closest('button');
			expect(confirmButton?.disabled).toBeFalsy();
		});
	});

	it('should call onConfirm and close dialog when confirm is clicked', async () => {
		const node = createMockNode();
		const { getByText } = renderModal({ valid: true, node });

		await waitFor(() => {
			const confirmButton = getByText('chatHub.toolSettings.confirm').closest('button');
			expect(confirmButton?.disabled).toBeFalsy();
		});

		const confirmButton = getByText('chatHub.toolSettings.confirm').closest(
			'button',
		) as HTMLElement;
		await userEvent.click(confirmButton);

		expect(onConfirmMock).toHaveBeenCalledWith(node);
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});

	it('should close dialog when cancel is clicked', async () => {
		const { getByText } = renderModal();

		const cancelButton = getByText('chatHub.toolSettings.cancel').closest('button') as HTMLElement;
		await userEvent.click(cancelButton);

		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
		expect(onConfirmMock).not.toHaveBeenCalled();
	});
});
