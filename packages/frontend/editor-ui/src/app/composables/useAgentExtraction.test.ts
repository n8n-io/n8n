import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import type { INodeUi } from '@/Interface';

const AGENT_NODE_TYPE = '@n8n/n8n-nodes-langchain.agent';

const { mockWorkflowDocumentStore, mockRootStore, mockToast, mockRouter, mockExtractAgent } =
	vi.hoisted(() => ({
		mockWorkflowDocumentStore: {
			workflowId: 'wf-1',
			homeProject: { id: 'project-1' } as { id: string } | null,
			getNodeById: vi.fn(),
		},
		mockRootStore: {
			restApiContext: { baseUrl: '/rest', sessionId: 'session-1' },
		},
		mockToast: {
			showMessage: vi.fn(),
			showError: vi.fn(),
		},
		mockRouter: {
			resolve: vi.fn(() => ({ href: '/projects/project-1/agents/agent-99' })),
		},
		mockExtractAgent: vi.fn(),
	}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: vi.fn().mockReturnValue({ value: mockWorkflowDocumentStore }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn().mockReturnValue(mockRootStore),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue(mockToast),
}));

vi.mock('vue-router', () => ({
	useRouter: vi.fn().mockReturnValue(mockRouter),
}));

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	extractAgentFromWorkflow: mockExtractAgent,
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: vi.fn().mockReturnValue({
		baseText: (key: string, opts?: { interpolate?: Record<string, string> }) =>
			opts?.interpolate?.url ? `${key}::${opts.interpolate.url}` : key,
	}),
}));

import { useAgentExtraction } from './useAgentExtraction';

function makeNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return {
		id: 'node-1',
		name: 'AI Agent',
		type: AGENT_NODE_TYPE,
		typeVersion: 3.1,
		position: [0, 0],
		parameters: {},
		...overrides,
	} as INodeUi;
}

describe('useAgentExtraction', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.clearAllMocks();
		mockWorkflowDocumentStore.workflowId = 'wf-1';
		mockWorkflowDocumentStore.homeProject = { id: 'project-1' };
	});

	it('calls the API and shows a success toast for a clean extraction', async () => {
		mockWorkflowDocumentStore.getNodeById.mockReturnValue(makeNode());
		mockExtractAgent.mockResolvedValue({
			agent: { id: 'agent-99', name: 'AI Agent' },
			warnings: [],
		});

		const { extractAgent } = useAgentExtraction();
		await extractAgent('node-1');

		expect(mockExtractAgent).toHaveBeenCalledWith(mockRootStore.restApiContext, 'project-1', {
			workflowId: 'wf-1',
			nodeName: 'AI Agent',
		});
		expect(mockToast.showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'success' }),
		);
		expect(mockToast.showError).not.toHaveBeenCalled();
	});

	it('surfaces a warning toast when the backend reports warnings', async () => {
		mockWorkflowDocumentStore.getNodeById.mockReturnValue(makeNode());
		mockExtractAgent.mockResolvedValue({
			agent: { id: 'agent-99', name: 'AI Agent' },
			warnings: [{ code: 'output_parser_dropped', message: 'Parser dropped' }],
		});

		const { extractAgent } = useAgentExtraction();
		await extractAgent('node-1');

		const call = mockToast.showMessage.mock.calls[0]?.[0];
		expect(call?.type).toBe('warning');
		expect(call?.message).toContain('Parser dropped');
	});

	it('refuses non-Agent nodes', async () => {
		mockWorkflowDocumentStore.getNodeById.mockReturnValue(
			makeNode({ type: '@n8n/n8n-nodes-base.set' }),
		);

		const { extractAgent } = useAgentExtraction();
		await extractAgent('node-1');

		expect(mockExtractAgent).not.toHaveBeenCalled();
		expect(mockToast.showError).toHaveBeenCalled();
	});

	it('errors when the workflow has no home project', async () => {
		mockWorkflowDocumentStore.getNodeById.mockReturnValue(makeNode());
		mockWorkflowDocumentStore.homeProject = null;

		const { extractAgent } = useAgentExtraction();
		await extractAgent('node-1');

		expect(mockExtractAgent).not.toHaveBeenCalled();
		expect(mockToast.showError).toHaveBeenCalled();
	});

	it('surfaces backend errors via showError', async () => {
		mockWorkflowDocumentStore.getNodeById.mockReturnValue(makeNode());
		const error = new Error('boom');
		mockExtractAgent.mockRejectedValue(error);

		const { extractAgent } = useAgentExtraction();
		await extractAgent('node-1');

		expect(mockToast.showError).toHaveBeenCalledWith(error, expect.any(String));
	});
});
