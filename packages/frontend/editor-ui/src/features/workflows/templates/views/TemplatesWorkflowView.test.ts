import { ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { mock } from 'vitest-mock-extended';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import TemplatesWorkflowView from './TemplatesWorkflowView.vue';

const mockRestrictedNodeTypes = vi.hoisted(() => ({ value: [] as unknown[] }));

vi.mock('../composables/useTemplateRestrictedNodeTypes', async () => {
	const { computed } = await import('vue');
	return {
		useTemplateRestrictedNodeTypes: () => ({
			restrictedNodeTypes: computed(() => mockRestrictedNodeTypes.value),
		}),
	};
});

vi.mock('vue-router', () => ({
	useRoute: () => ({ params: { id: '1' }, query: {} }),
	useRouter: () => ({ push: vi.fn(), resolve: vi.fn() }),
	RouterLink: { template: '<a><slot /></a>' },
}));

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', () => ({
	ensurePersonalProjectId: vi.fn(),
	useInstanceAiHandoff: () => ({ startThread: vi.fn() }),
}));

vi.mock(
	'@/features/ai/instanceAi/composables/useInstanceAiAvailability',
	async (importOriginal) => ({
		...(await importOriginal<object>()),
		useInstanceAiAvailable: () => ref(false),
	}),
);

const renderComponent = createComponentRenderer(TemplatesWorkflowView, {
	global: {
		stubs: {
			TemplatesView: { template: '<div><slot name="header" /><slot name="content" /></div>' },
			WorkflowPreviewHost: true,
			N8nMarkdown: true,
			RestrictedTemplateNodesCallout: {
				props: ['restricted'],
				template:
					'<div data-test-id="restricted-template-nodes-callout">{{ restricted.map((type) => type.displayName).join(", ") }}</div>',
			},
			RecommendedTemplateCard: {
				props: ['template', 'restrictedNodeTypes'],
				template: '<div data-test-id="template-card">{{ restrictedNodeTypes.join(",") }}</div>',
			},
		},
	},
});

describe('TemplatesWorkflowView', () => {
	beforeEach(() => {
		createTestingPinia();
		mockedStore(useTemplatesStore).getFullTemplateById = vi.fn().mockReturnValue(
			mock<ITemplatesWorkflowFull>({
				id: 1,
				name: 'Qualify leads',
				full: true,
				description: '',
				workflow: { nodes: [], connections: {} },
			}),
		);
		mockRestrictedNodeTypes.value = [];
	});

	it('names the restricted nodes above the template and greys them on the card', async () => {
		mockRestrictedNodeTypes.value = [
			{
				name: 'n8n-nodes-base.gmailTrigger',
				nodeType: 'n8n-nodes-base.gmailTrigger',
				displayName: 'Gmail Trigger',
				scope: 'instance',
			},
		];

		const { findByTestId } = renderComponent();

		expect(await findByTestId('restricted-template-nodes-callout')).toHaveTextContent(
			'Gmail Trigger',
		);
		expect(await findByTestId('template-card')).toHaveTextContent('n8n-nodes-base.gmailTrigger');
	});

	it('changes nothing for a template without restricted nodes', async () => {
		const { findByTestId, queryByTestId } = renderComponent();

		expect(await findByTestId('template-card')).toHaveTextContent('');
		expect(queryByTestId('restricted-template-nodes-callout')).not.toBeInTheDocument();
	});
});
