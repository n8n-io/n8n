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
			NodeIcon: {
				props: { nodeType: Object, size: Number, disabled: Boolean },
				template: '<div class="node-icon-stub" :data-disabled="disabled"></div>',
			},
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
	iconOf: (name: string) => string = (name) => name,
): ITemplatesWorkflowFull =>
	mock<ITemplatesWorkflowFull>({
		id: 1,
		name: 'Test template',
		nodes: nodeTypeNames.map((name) => ({ name, icon: iconOf(name) })),
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
			expect(restricted[0]).toHaveAttribute('data-disabled', 'true');
			const icons = document.querySelectorAll('.node-icon-stub');
			expect([...icons].map((icon) => icon.getAttribute('data-disabled'))).toEqual([
				'true',
				'false',
			]);
			expect(mockGetNodeType.mock.calls.map(([name]) => name)).toEqual(['gmailTrigger', 'openAi']);
		});

		it('keeps the restricted node when an earlier node has the same icon', () => {
			renderComponent({
				props: {
					template: makeTemplate([], ['gmailTrigger', 'gmail'], () => 'file:gmail.svg'),
					restrictedNodeTypes: ['gmail'],
				},
			});

			expect(screen.getByTestId('template-card-restricted-node')).toHaveAttribute(
				'data-disabled',
				'true',
			);
			expect(mockGetNodeType.mock.calls.map(([name]) => name)).toEqual(['gmail']);
		});

		it('greys no icon without restricted node types', () => {
			renderComponent({
				props: { template: makeTemplate([], ['openAi', 'gmailTrigger']) },
			});

			expect(screen.queryByTestId('template-card-restricted-node')).not.toBeInTheDocument();
		});
	});
});
