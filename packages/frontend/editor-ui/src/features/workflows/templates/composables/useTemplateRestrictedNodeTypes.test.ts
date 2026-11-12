import { createTestingPinia } from '@pinia/testing';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { mock } from 'vitest-mock-extended';
import { ref } from 'vue';
import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useTemplateRestrictedNodeTypes } from './useTemplateRestrictedNodeTypes';

const mockNodeTypeRestriction = vi.fn();

vi.mock('@n8n/frontend-module-type-availability-policies', async () => {
	const actual = await vi.importActual('@n8n/frontend-module-type-availability-policies');
	return {
		...actual,
		useTypeAvailability: () => ({ nodeTypeRestriction: mockNodeTypeRestriction }),
	};
});

const makeTemplate = (
	workflowNodeTypes: string[],
	nodes: Array<{ name: string; displayName: string }> = [],
): ITemplatesWorkflowFull =>
	mock<ITemplatesWorkflowFull>({
		id: 1,
		nodes,
		workflow: { nodes: workflowNodeTypes.map((type, index) => ({ name: `Node ${index}`, type })) },
		full: true,
	});

describe('useTemplateRestrictedNodeTypes', () => {
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		createTestingPinia();
		nodeTypesStore = mockedStore(useNodeTypesStore);
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue(null);
		mockNodeTypeRestriction.mockReset().mockReturnValue(null);
	});

	it('lists each restricted node type once, with its verdict', () => {
		mockNodeTypeRestriction.mockImplementation((type: string) =>
			type === 'n8n-nodes-base.gmailTrigger'
				? { name: type, available: false, scope: 'instance' }
				: null,
		);
		nodeTypesStore.getNodeType = vi.fn((type: string) =>
			type === 'n8n-nodes-base.gmailTrigger' ? { displayName: 'Gmail Trigger' } : null,
		) as unknown as typeof nodeTypesStore.getNodeType;

		const { restrictedNodeTypes } = useTemplateRestrictedNodeTypes(
			ref(
				makeTemplate([
					'n8n-nodes-base.gmailTrigger',
					'n8n-nodes-base.gmailTrigger',
					'n8n-nodes-base.if',
				]),
			),
			'project-1',
		);

		expect(restrictedNodeTypes.value).toEqual([
			{
				name: 'n8n-nodes-base.gmailTrigger',
				displayName: 'Gmail Trigger',
				available: false,
				scope: 'instance',
			},
		]);
	});

	it('falls back to the template display name, then to the type name', () => {
		mockNodeTypeRestriction.mockImplementation((type: string) => ({
			name: type,
			available: false,
			scope: 'project',
		}));

		const { restrictedNodeTypes } = useTemplateRestrictedNodeTypes(
			makeTemplate(
				['n8n-nodes-community.serpApi', 'n8n-nodes-community.unknown'],
				[{ name: 'n8n-nodes-community.serpApi', displayName: 'SerpApi' }],
			),
			'project-1',
		);

		expect(restrictedNodeTypes.value.map(({ displayName }) => displayName)).toEqual([
			'SerpApi',
			'n8n-nodes-community.unknown',
		]);
	});

	it('is empty when no node type is restricted', () => {
		const { restrictedNodeTypes } = useTemplateRestrictedNodeTypes(
			makeTemplate(['n8n-nodes-base.if']),
			'project-1',
		);

		expect(restrictedNodeTypes.value).toEqual([]);
	});

	it('is empty while the template is missing', () => {
		const { restrictedNodeTypes } = useTemplateRestrictedNodeTypes(null, 'project-1');

		expect(restrictedNodeTypes.value).toEqual([]);
	});
});
