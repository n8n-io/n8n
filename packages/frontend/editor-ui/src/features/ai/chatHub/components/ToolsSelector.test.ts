import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import ToolsSelector from './ToolsSelector.vue';
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { ChatHubToolDto } from '@n8n/api-types';
import { TOOLS_MANAGER_MODAL_KEY } from '@/features/ai/chatHub/constants';

vi.mock('@n8n/i18n', () => {
	const i18n = {
		baseText: (key: string) => key,
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

const TOOL_NODE_TYPE: INodeTypeDescription = {
	displayName: 'Test Tool',
	name: 'n8n-nodes-base.testTool',
	group: ['transform'],
	version: 1,
	description: 'A tool for testing',
	defaults: { name: 'Test Tool' },
	inputs: [],
	outputs: [{ type: NodeConnectionTypes.AiTool }],
	properties: [],
};

function createMockToolDto(id: string, name: string): ChatHubToolDto {
	return {
		definition: {
			id,
			name,
			type: 'n8n-nodes-base.testTool',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		enabled: true,
	};
}

const renderComponent = createComponentRenderer(ToolsSelector, {
	global: {
		stubs: {
			NodeIcon: { template: '<div />' },
		},
	},
});

function findMenuItemByText(text: string): Element | undefined {
	const menuItems = document.querySelectorAll('[role="menuitem"]');
	return Array.from(menuItems).find((item) => item.textContent?.includes(text));
}

describe('ToolsSelector', () => {
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
	let chatStore: ReturnType<typeof mockedStore<typeof useChatStore>>;

	beforeEach(() => {
		vi.clearAllMocks();

		createTestingPinia({ stubActions: false });

		nodeTypesStore = mockedStore(useNodeTypesStore);
		uiStore = mockedStore(useUIStore);
		chatStore = mockedStore(useChatStore);

		nodeTypesStore.getNodeType = vi.fn().mockReturnValue(TOOL_NODE_TYPE);
		nodeTypesStore.loadNodeTypesIfNotLoaded = vi.fn().mockResolvedValue(undefined);
		chatStore.configuredTools = [];
	});

	describe('when no tools are configured', () => {
		it('should show a button that opens ToolsManagerModal', async () => {
			const { getByTestId } = renderComponent({
				props: { disabled: false, checkedToolIds: [] },
			});

			const button = getByTestId('chat-tools-button');
			expect(button.textContent).toContain('chatHub.tools.selector.label.default');

			await userEvent.click(button);

			expect(uiStore.openModalWithData).toHaveBeenCalledWith(
				expect.objectContaining({ name: TOOLS_MANAGER_MODAL_KEY }),
			);
		});

		it('should not open a dropdown on click', async () => {
			const { getByTestId } = renderComponent({
				props: { disabled: false, checkedToolIds: [] },
			});

			await userEvent.click(getByTestId('chat-tools-button'));

			expect(document.querySelector('[role="menu"]')).not.toBeInTheDocument();
		});
	});

	describe('when tools are configured', () => {
		beforeEach(() => {
			chatStore.configuredTools = [
				createMockToolDto('tool-1', 'My Tool'),
				createMockToolDto('tool-2', 'Other Tool'),
			];
		});

		it('should show tool name when single tool is checked', () => {
			chatStore.configuredTools = [createMockToolDto('tool-1', 'My Tool')];

			const { getByTestId } = renderComponent({
				props: { disabled: false, checkedToolIds: ['tool-1'] },
			});

			expect(getByTestId('chat-tools-button').textContent).toContain('My Tool');
		});

		it('should show count label when multiple tools are checked', () => {
			const { getByTestId } = renderComponent({
				props: { disabled: false, checkedToolIds: ['tool-1', 'tool-2'] },
			});

			expect(getByTestId('chat-tools-button').textContent).toContain(
				'chatHub.tools.selector.label.count',
			);
		});

		it('should open dropdown with tool items on click', async () => {
			const { getByTestId } = renderComponent({
				props: { disabled: false, checkedToolIds: ['tool-1'] },
			});

			await userEvent.click(getByTestId('chat-tools-button'));

			await waitFor(() => {
				expect(findMenuItemByText('My Tool')).toBeTruthy();
				expect(findMenuItemByText('Other Tool')).toBeTruthy();
			});
		});

		it('should emit toggle when a tool item is clicked', async () => {
			const { getByTestId, emitted } = renderComponent({
				props: { disabled: false, checkedToolIds: ['tool-1'] },
			});

			await userEvent.click(getByTestId('chat-tools-button'));

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});

			const toolItem = findMenuItemByText('Other Tool');
			await userEvent.click(toolItem!);

			await waitFor(() => {
				expect(emitted('toggle')?.[0]).toEqual(['tool-2']);
			});
		});
	});

	describe('create new tool action', () => {
		beforeEach(() => {
			chatStore.configuredTools = [createMockToolDto('tool-1', 'My Tool')];
		});

		it('should show "Create new tool" item in dropdown', async () => {
			const { getByTestId } = renderComponent({
				props: { disabled: false, checkedToolIds: ['tool-1'] },
			});

			await userEvent.click(getByTestId('chat-tools-button'));

			await waitFor(() => {
				expect(findMenuItemByText('chatHub.tools.selector.createNew')).toBeTruthy();
			});
		});

		it('should render alongside tool items', async () => {
			chatStore.configuredTools = [
				createMockToolDto('tool-1', 'Tool Alpha'),
				createMockToolDto('tool-2', 'Tool Beta'),
			];

			const { getByTestId } = renderComponent({
				props: { disabled: false, checkedToolIds: ['tool-1', 'tool-2'] },
			});

			await userEvent.click(getByTestId('chat-tools-button'));

			await waitFor(() => {
				const menuItems = document.querySelectorAll('[role="menuitem"]');
				// 2 tools + 1 "Create new tool"
				expect(menuItems).toHaveLength(3);
			});
		});

		it('should open ToolsManagerModal when clicked', async () => {
			const { getByTestId } = renderComponent({
				props: { disabled: false, checkedToolIds: ['tool-1'] },
			});

			await userEvent.click(getByTestId('chat-tools-button'));

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});

			const createNewItem = findMenuItemByText('chatHub.tools.selector.createNew');
			await userEvent.click(createNewItem!);

			await waitFor(() => {
				expect(uiStore.openModalWithData).toHaveBeenCalledWith(
					expect.objectContaining({ name: TOOLS_MANAGER_MODAL_KEY }),
				);
			});
		});

		it('should not emit toggle when clicked', async () => {
			const { getByTestId, emitted } = renderComponent({
				props: { disabled: false, checkedToolIds: ['tool-1'] },
			});

			await userEvent.click(getByTestId('chat-tools-button'));

			await waitFor(() => {
				expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
			});

			const createNewItem = findMenuItemByText('chatHub.tools.selector.createNew');
			await userEvent.click(createNewItem!);

			await waitFor(() => {
				expect(uiStore.openModalWithData).toHaveBeenCalled();
			});

			expect(emitted('toggle')).toBeUndefined();
		});
	});
});
