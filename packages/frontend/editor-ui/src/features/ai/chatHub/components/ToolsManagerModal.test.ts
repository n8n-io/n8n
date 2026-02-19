import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import ToolsManagerModal from './ToolsManagerModal.vue';
import { NodeConnectionTypes, type INode, type INodeTypeDescription } from 'n8n-workflow';
import { fireEvent, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { MODAL_CONFIRM } from '@/app/constants';
import type { ChatHubToolDto } from '@n8n/api-types';

vi.mock('virtual:node-popularity-data', () => ({
	default: [
		{ id: 'n8n-nodes-base.toolA', popularity: 100 },
		{ id: 'n8n-nodes-base.toolB', popularity: 50 },
	],
}));

vi.mock('@n8n/i18n', () => {
	const i18n = {
		baseText: (key: string, opts?: { interpolate?: Record<string, unknown> }) => {
			if (opts?.interpolate) {
				return `${key} ${JSON.stringify(opts.interpolate)}`;
			}
			return key;
		},
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

const mockConfirm = vi.fn();
vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: mockConfirm }),
}));

const mockShowError = vi.fn();
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError }),
}));

vi.mock('@/app/utils/rbac/checks/hasRole', () => ({
	hasRole: vi.fn().mockReturnValue(false),
}));

vi.mock('uuid', () => ({
	v4: () => 'mock-uuid-1234',
}));

const TOOL_NODE_TYPE_A: INodeTypeDescription = {
	displayName: 'Tool A',
	name: 'n8n-nodes-base.toolA',
	group: ['transform'],
	version: 1,
	description: 'A tool for testing',
	defaults: { name: 'Tool A' },
	inputs: [],
	outputs: [{ type: NodeConnectionTypes.AiTool }],
	properties: [],
};

const TOOL_NODE_TYPE_B: INodeTypeDescription = {
	displayName: 'Tool B',
	name: 'n8n-nodes-base.toolB',
	group: ['transform'],
	version: 1,
	description: 'Another tool for testing',
	defaults: { name: 'Tool B' },
	inputs: [],
	outputs: [{ type: NodeConnectionTypes.AiTool }],
	properties: [],
};

const TOOL_NODE_TYPE_WITH_INPUTS: INodeTypeDescription = {
	...TOOL_NODE_TYPE_A,
	name: 'n8n-nodes-base.toolWithInputs',
	displayName: 'Tool With Inputs',
	inputs: ['main'],
};

function createMockToolDto(overrides: Partial<INode> = {}, enabled = true): ChatHubToolDto {
	return {
		definition: {
			id: 'tool-1',
			name: 'Configured Tool A',
			type: 'n8n-nodes-base.toolA',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			...overrides,
		},
		enabled,
	};
}

const MODAL_NAME = 'ToolsManagerModal';
const onConfirmMock = vi.fn();

const renderComponent = createComponentRenderer(ToolsManagerModal, {
	global: {
		stubs: {
			// Render dialog portal content inline instead of teleporting
			DialogPortal: { template: '<div><slot /></div>' },
			DialogOverlay: { template: '<div />' },
			ToolSettingsContent: {
				template: '<div data-test-id="tool-settings-content" />',
				props: ['initialNode', 'existingToolNames'],
			},
			NodeIcon: { template: '<div />' },
		},
	},
});

function getConfiguredItems(container: Element) {
	return Array.from(container.querySelectorAll('.item.configured'));
}

function getAvailableItems(container: Element) {
	return Array.from(container.querySelectorAll('.item:not(.configured)'));
}

function getActionButtons(item: Element) {
	return Array.from(item.querySelectorAll('.actions button'));
}

function getToggle(item: Element) {
	return item.querySelector('[role="switch"]') as HTMLElement;
}

describe('ToolsManagerModal', () => {
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
	let chatStore: ReturnType<typeof mockedStore<typeof useChatStore>>;

	beforeEach(() => {
		vi.clearAllMocks();

		createTestingPinia({ stubActions: false });

		nodeTypesStore = mockedStore(useNodeTypesStore);
		uiStore = mockedStore(useUIStore);
		chatStore = mockedStore(useChatStore);

		nodeTypesStore.getNodeType = vi.fn().mockImplementation((name: string) => {
			if (name === 'n8n-nodes-base.toolA') return TOOL_NODE_TYPE_A;
			if (name === 'n8n-nodes-base.toolB') return TOOL_NODE_TYPE_B;
			if (name === 'n8n-nodes-base.toolWithInputs') return TOOL_NODE_TYPE_WITH_INPUTS;
			return null;
		});
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
			[NodeConnectionTypes.AiTool]: ['n8n-nodes-base.toolA', 'n8n-nodes-base.toolB'],
		};

		chatStore.configuredTools = [];
		chatStore.customAgents = {};
		chatStore.addConfiguredTool = vi.fn().mockResolvedValue(undefined);
		chatStore.updateConfiguredTool = vi.fn().mockResolvedValue(undefined);
		chatStore.removeConfiguredTool = vi.fn().mockResolvedValue(undefined);
		chatStore.toggleToolEnabled = vi.fn().mockResolvedValue(undefined);
		chatStore.toggleCustomAgentTool = vi.fn().mockResolvedValue(undefined);

		uiStore.closeModal = vi.fn();
	});

	function defaultProps() {
		return {
			modalName: MODAL_NAME,
			data: {
				tools: [],
				onConfirm: onConfirmMock,
			},
		};
	}

	it('should render the modal title', () => {
		const { getByText } = renderComponent({ props: defaultProps() });

		expect(getByText('chatHub.toolsManager.title')).toBeTruthy();
	});

	it('should render search input', () => {
		const { container } = renderComponent({ props: defaultProps() });

		const input = container.querySelector('input');
		expect(input).toBeTruthy();
	});

	it('should render available tools from node types store', () => {
		const { getByText, container } = renderComponent({ props: defaultProps() });

		expect(getByText('Tool A')).toBeTruthy();
		expect(getByText('Tool B')).toBeTruthy();
		expect(getAvailableItems(container)).toHaveLength(2);
	});

	it('should render configured tools section when tools exist', () => {
		chatStore.configuredTools = [createMockToolDto()];

		const { getByText, container } = renderComponent({ props: defaultProps() });

		expect(getByText('Configured Tool A')).toBeTruthy();
		expect(getConfiguredItems(container)).toHaveLength(1);
	});

	it('should show empty state when no tools are available', () => {
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {};

		const { getByText } = renderComponent({ props: defaultProps() });

		expect(getByText('chatHub.toolsManager.noResults')).toBeTruthy();
	});

	it('should sort available tools by popularity', () => {
		const { container } = renderComponent({ props: defaultProps() });

		const availableItems = getAvailableItems(container);
		expect(availableItems).toHaveLength(2);
		// Tool A (popularity 100) should come before Tool B (popularity 50)
		expect(availableItems[0].textContent).toContain('Tool A');
		expect(availableItems[1].textContent).toContain('Tool B');
	});

	it('should filter out tools with inputs', () => {
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
			[NodeConnectionTypes.AiTool]: ['n8n-nodes-base.toolA', 'n8n-nodes-base.toolWithInputs'],
		};

		const { container, getByText, queryByText } = renderComponent({ props: defaultProps() });

		const availableItems = getAvailableItems(container);
		// Only toolA should appear (toolWithInputs has inputs and is excluded)
		expect(availableItems).toHaveLength(1);
		expect(getByText('Tool A')).toBeTruthy();
		expect(queryByText('Tool With Inputs')).toBeNull();
	});

	describe('tool actions', () => {
		it('should switch to settings view when adding a tool', async () => {
			const { getAllByText, getByTestId } = renderComponent({ props: defaultProps() });

			const addButtons = getAllByText('chatHub.toolsManager.add');
			await userEvent.click(addButtons[0]);

			await waitFor(() => {
				expect(getByTestId('tool-settings-content')).toBeTruthy();
			});
		});

		it('should switch to settings view when configuring a tool', async () => {
			chatStore.configuredTools = [createMockToolDto()];

			const { container, getByTestId } = renderComponent({ props: defaultProps() });

			const configuredItem = getConfiguredItems(container)[0];
			const [configureBtn] = getActionButtons(configuredItem);
			await userEvent.click(configureBtn);

			await waitFor(() => {
				expect(getByTestId('tool-settings-content')).toBeTruthy();
			});
		});

		it('should call removeConfiguredTool after confirmation', async () => {
			const tool = createMockToolDto({ id: 'tool-to-remove' });
			chatStore.configuredTools = [tool];
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);

			const { container } = renderComponent({ props: defaultProps() });

			const configuredItem = getConfiguredItems(container)[0];
			const [, removeBtn] = getActionButtons(configuredItem);
			await userEvent.click(removeBtn);

			await waitFor(() => {
				expect(mockConfirm).toHaveBeenCalled();
				expect(chatStore.removeConfiguredTool).toHaveBeenCalledWith('tool-to-remove');
			});
		});

		it('should not remove tool if confirmation is cancelled', async () => {
			const tool = createMockToolDto({ id: 'tool-keep' });
			chatStore.configuredTools = [tool];
			mockConfirm.mockResolvedValue('cancel');

			const { container } = renderComponent({ props: defaultProps() });

			const configuredItem = getConfiguredItems(container)[0];
			const [, removeBtn] = getActionButtons(configuredItem);
			await userEvent.click(removeBtn);

			await waitFor(() => {
				expect(mockConfirm).toHaveBeenCalled();
			});
			expect(chatStore.removeConfiguredTool).not.toHaveBeenCalled();
		});

		it('should call toggleToolEnabled when toggling a tool', async () => {
			const tool = createMockToolDto({ id: 'tool-toggle' }, false);
			chatStore.configuredTools = [tool];

			const { container } = renderComponent({ props: defaultProps() });

			const configuredItem = getConfiguredItems(container)[0];
			const toggle = getToggle(configuredItem);
			await fireEvent.click(toggle);

			await waitFor(() => {
				expect(chatStore.toggleToolEnabled).toHaveBeenCalledWith('tool-toggle', true);
			});
		});

		it('should call toggleCustomAgentTool when toggling in agent context', async () => {
			const tool = createMockToolDto({ id: 'tool-agent-toggle' });
			chatStore.configuredTools = [tool];
			chatStore.customAgents = {
				'agent-1': { name: 'Test Agent', toolIds: ['tool-agent-toggle'] } as never,
			};

			const { container } = renderComponent({
				props: {
					...defaultProps(),
					data: { ...defaultProps().data, customAgentId: 'agent-1' },
				},
			});

			const configuredItem = getConfiguredItems(container)[0];
			const toggle = getToggle(configuredItem);
			await fireEvent.click(toggle);

			await waitFor(() => {
				expect(chatStore.toggleCustomAgentTool).toHaveBeenCalledWith(
					'agent-1',
					'tool-agent-toggle',
				);
			});
		});
	});

	describe('settings view', () => {
		it('should show back button in settings view', async () => {
			const { getAllByText, container } = renderComponent({ props: defaultProps() });

			const addButtons = getAllByText('chatHub.toolsManager.add');
			await userEvent.click(addButtons[0]);

			await waitFor(() => {
				const backButton = container.querySelector('.backButton');
				expect(backButton).toBeTruthy();
			});
		});

		it('should return to list view when back button is clicked', async () => {
			const { getAllByText, queryByTestId, container } = renderComponent({
				props: defaultProps(),
			});

			const addButtons = getAllByText('chatHub.toolsManager.add');
			await userEvent.click(addButtons[0]);

			await waitFor(() => {
				expect(queryByTestId('tool-settings-content')).toBeTruthy();
			});

			// Click back - use fireEvent to bypass pointer-events check on body
			const backButton = container.querySelector('.backButton') as HTMLElement;
			await fireEvent.click(backButton);

			await waitFor(() => {
				expect(queryByTestId('tool-settings-content')).toBeNull();
			});
		});
	});

	describe('custom agent context', () => {
		it('should show agent name in title', () => {
			chatStore.customAgents = {
				'agent-1': { name: 'My Agent', toolIds: [] } as never,
			};

			const { getByText } = renderComponent({
				props: {
					...defaultProps(),
					data: { ...defaultProps().data, customAgentId: 'agent-1' },
				},
			});

			expect(getByText('chatHub.toolsManager.title (My Agent)')).toBeTruthy();
		});
	});

	describe('error handling', () => {
		it('should show error toast when remove fails', async () => {
			const tool = createMockToolDto({ id: 'fail-remove' });
			chatStore.configuredTools = [tool];
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);
			const error = new Error('Remove failed');
			chatStore.removeConfiguredTool = vi.fn().mockRejectedValue(error);

			const { container } = renderComponent({ props: defaultProps() });

			const configuredItem = getConfiguredItems(container)[0];
			const [, removeBtn] = getActionButtons(configuredItem);
			await userEvent.click(removeBtn);

			await waitFor(() => {
				expect(mockShowError).toHaveBeenCalledWith(error, 'chatHub.error.updateToolsFailed');
			});
		});

		it('should show error toast when toggle fails', async () => {
			const tool = createMockToolDto({ id: 'fail-toggle' }, false);
			chatStore.configuredTools = [tool];
			const error = new Error('Toggle failed');
			chatStore.toggleToolEnabled = vi.fn().mockRejectedValue(error);

			const { container } = renderComponent({ props: defaultProps() });

			const configuredItem = getConfiguredItems(container)[0];
			const toggle = getToggle(configuredItem);
			await fireEvent.click(toggle);

			await waitFor(() => {
				expect(mockShowError).toHaveBeenCalledWith(error, 'chatHub.error.updateToolsFailed');
			});
		});
	});
});
