import { createComponentRenderer } from '@/__tests__/render';
import { getNodeTypeDisplayableCredentials } from '@/app/utils/nodes/nodeTransforms';
import type {
	ITemplatesWorkflowFull,
	IWorkflowTemplateNode,
} from '@n8n/rest-api-client/api/templates';
import { screen } from '@testing-library/vue';
import type { INodeCredentialDescription } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';
import RecommendedTemplateCard from './RecommendedTemplateCard.vue';

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => ({}),
	RouterLink: vi.fn(),
}));

vi.mock('../recommendedTemplates.store', () => ({
	useRecommendedTemplatesStore: () => ({
		getTemplateRoute: vi.fn(),
		trackTemplateTileClick: vi.fn(),
		trackTemplateShown: vi.fn(),
	}),
}));

const mockGetNodeType = vi.hoisted(() => vi.fn());

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: mockGetNodeType,
	}),
}));

vi.mock('@/app/utils/nodes/nodeTransforms', () => ({
	getNodeTypeDisplayableCredentials: vi.fn(),
}));

const renderComponent = createComponentRenderer(RecommendedTemplateCard, {
	global: {
		stubs: {
			NodeIcon: true,
		},
	},
});

const mockGetNodeTypeDisplayableCredentials = vi.mocked(getNodeTypeDisplayableCredentials);

const REQUIRED_CREDENTIALS: INodeCredentialDescription[] = [
	mock<INodeCredentialDescription>({ name: 'httpBasicAuth' }),
];

const makeTemplateNodeWithCredentials = (
	credentials: IWorkflowTemplateNode['credentials'],
): IWorkflowTemplateNode =>
	mock<IWorkflowTemplateNode>({
		name: 'Node',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials,
	});

const makeTemplate = (
	workflowNodes: IWorkflowTemplateNode[],
	nodeTypeNames: string[] = [],
): ITemplatesWorkflowFull =>
	mock<ITemplatesWorkflowFull>({
		id: 1,
		name: 'Test template',
		nodes: nodeTypeNames.map((name) => ({ name, icon: name })),
		workflow: { nodes: workflowNodes },
		full: true,
	});

describe('RecommendedTemplateCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetNodeType.mockReturnValue(undefined);
		mockGetNodeTypeDisplayableCredentials.mockReturnValue(REQUIRED_CREDENTIALS);
	});

	it('renders the base setup time when there are no workflow nodes', () => {
		renderComponent({
			props: {
				template: makeTemplate([]),
			},
		});

		expect(screen.getByText('2 min setup')).toBeInTheDocument();
	});

	it('calculates setup time from unique credentials (dedupes same type + name)', () => {
		renderComponent({
			props: {
				template: makeTemplate([
					makeTemplateNodeWithCredentials({ httpBasicAuth: 'account-1' }),
					makeTemplateNodeWithCredentials({ httpBasicAuth: 'account-1' }),
				]),
			},
		});

		// BASE_TIME (2) + 1 unique credential * CREDENTIAL_TIME (3) = 5
		expect(screen.getByText('5 min setup')).toBeInTheDocument();
	});

	it('adds time for multiple unique credentials', () => {
		renderComponent({
			props: {
				template: makeTemplate([
					makeTemplateNodeWithCredentials({ httpBasicAuth: 'account-1' }),
					makeTemplateNodeWithCredentials({ httpBasicAuth: { id: '2', name: 'account-2' } }),
				]),
			},
		});

		// BASE_TIME (2) + 2 unique credentials * CREDENTIAL_TIME (3) = 8
		expect(screen.getByText('8 min setup')).toBeInTheDocument();
	});

	describe('restricted node types', () => {
		beforeEach(() => {
			mockGetNodeType.mockImplementation((name: string) => ({ name }));
		});

		it('shows a restricted node type first and greys its icon', () => {
			renderComponent({
				props: {
					template: makeTemplate([], ['openAi', 'sheets', 'gmailTrigger']),
					restrictedNodeTypes: ['gmailTrigger'],
				},
			});

			const restricted = screen.getAllByTestId('template-card-restricted-node');
			expect(restricted).toHaveLength(1);
			expect(mockGetNodeType.mock.calls.map(([name]) => name)).toEqual(['gmailTrigger', 'openAi']);
		});

		it('greys no icon without restricted node types', () => {
			renderComponent({
				props: { template: makeTemplate([], ['openAi', 'gmailTrigger']) },
			});

			expect(screen.queryByTestId('template-card-restricted-node')).not.toBeInTheDocument();
		});
	});
});
