import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import type { INodeTypeDescription } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import { createMockMessage } from '../__test__/data';
import ChatResultCard from './ChatResultCard.vue';

const resolveMock = vi.fn(() => ({ href: '/workflow/wf-1/executions/42' }));
vi.mock('vue-router', () => ({
	useRouter: () => ({ resolve: resolveMock }),
	// `useChatStore` → `useToast` → `useRoute`
	useRoute: () => ({ params: {}, query: {} }),
}));

const renderComponent = createComponentRenderer(ChatResultCard);

const card = {
	type: 'keyValue' as const,
	title: 'Weekly summary',
	nodeType: 'n8n-nodes-base.code',
	pairs: [{ key: 'Total', value: '12' }],
};

describe('ChatResultCard', () => {
	it('renders the card with the execution link when the message has an execution', async () => {
		const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
		const pinia = createTestingPinia();
		mockedStore(useWorkflowsStore).canViewWorkflows = true;
		const message = createMockMessage({
			type: 'ai',
			provider: 'n8n',
			workflowId: 'wf-1',
			executionId: 42,
			content: [],
		});
		const { getByTestId, getByText } = renderComponent({
			props: { message, card },
			pinia,
		});

		expect(getByTestId('result-card')).toBeInTheDocument();
		await fireEvent.click(getByTestId('result-card-toggle'));
		await fireEvent.click(getByText('Open execution'));
		expect(resolveMock).toHaveBeenCalledWith({
			name: 'ExecutionPreview',
			params: { workflowId: 'wf-1', executionId: '42' },
		});
		expect(openSpy).toHaveBeenCalledWith('/workflow/wf-1/executions/42', '_blank');
	});

	it('does not offer the execution link when the message is not from an n8n workflow', async () => {
		const pinia = createTestingPinia();
		mockedStore(useWorkflowsStore).canViewWorkflows = true;
		const message = createMockMessage({
			type: 'ai',
			provider: 'openai',
			workflowId: null,
			executionId: null,
			content: [],
		});
		const { getByTestId, queryByText } = renderComponent({
			props: { message, card },
			pinia,
		});

		await fireEvent.click(getByTestId('result-card-toggle'));
		expect(getByTestId('result-card-details')).toBeInTheDocument();
		expect(queryByText('Open execution')).not.toBeInTheDocument();
	});

	it('does not offer the execution link when the user cannot view workflows', async () => {
		const pinia = createTestingPinia();
		mockedStore(useWorkflowsStore).canViewWorkflows = false;
		const message = createMockMessage({
			type: 'ai',
			provider: 'n8n',
			workflowId: 'wf-1',
			executionId: 42,
			content: [],
		});
		const { getByTestId, queryByText } = renderComponent({
			props: { message, card },
			pinia,
		});

		await fireEvent.click(getByTestId('result-card-toggle'));
		expect(getByTestId('result-card-details')).toBeInTheDocument();
		expect(queryByText('Open execution')).not.toBeInTheDocument();
	});

	it('renders without icons when none of the node types are known', () => {
		const pinia = createTestingPinia();
		mockedStore(useNodeTypesStore).getNodeType = vi.fn().mockReturnValue(null);
		const message = createMockMessage({ type: 'ai', provider: 'n8n', content: [] });
		const { getByTestId, container } = renderComponent({
			props: { message, card: { ...card, nodeType: undefined, nodeTypes: ['a', 'b'] } },
			pinia,
		});

		expect(getByTestId('result-card')).toBeInTheDocument();
		expect(container.querySelectorAll('.n8n-node-icon')).toHaveLength(0);
	});

	it('renders one node icon per resolvable node type, in run order', () => {
		const pinia = createTestingPinia();
		const descriptions: Record<string, INodeTypeDescription> = {
			a: { name: 'a', icon: 'icon:bot', defaults: {} } as unknown as INodeTypeDescription,
			b: { name: 'b', iconUrl: 'icons/b.svg', defaults: {} } as unknown as INodeTypeDescription,
		};
		mockedStore(useNodeTypesStore).getNodeType = vi.fn(
			(type: string) => descriptions[type] ?? null,
		);
		const message = createMockMessage({ type: 'ai', provider: 'n8n', content: [] });
		const { container } = renderComponent({
			props: { message, card: { ...card, nodeType: undefined, nodeTypes: ['a', 'b', 'c'] } },
			pinia,
		});

		expect(container.querySelectorAll('.n8n-node-icon')).toHaveLength(2);
		expect(container.querySelector('.n8n-node-icon img')).toHaveAttribute(
			'src',
			expect.stringContaining('icons/b.svg'),
		);
	});
});
