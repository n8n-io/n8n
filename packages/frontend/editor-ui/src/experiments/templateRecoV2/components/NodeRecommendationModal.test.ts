import { createComponentRenderer } from '@/__tests__/render';
import { APP_MODALS_ELEMENT_ID, EXPERIMENT_TEMPLATE_RECO_V2_KEY } from '@/app/constants';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import { vi } from 'vitest';
import NodeRecommendationModal from './NodeRecommendationModal.vue';

vi.mock('../stores/templateRecoV2.store', () => ({
	usePersonalizedTemplatesV2Store: () => ({
		nodes: ['n8n-nodes-base.slack'],
		getNodeData: () => ({ youtube: [], starter: [], popular: [] }),
		getTemplateData: vi.fn(),
		trackModalTabView: vi.fn(),
		trackSeeMoreClick: vi.fn(),
	}),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: (name: string) => ({ name, displayName: 'Slack' }),
	}),
}));

vi.mock('@/features/workflows/templates/templates.store', () => ({
	useTemplatesStore: () => ({
		websiteTemplateRepositoryParameters: new URLSearchParams({
			utm_source: 'n8n_app',
			utm_instance: 'https://test.instance/',
		}),
		constructTemplateRepositoryURL: (params: URLSearchParams) =>
			`https://n8n.io/workflows/?${params.toString()}`,
	}),
}));

const renderComponent = createComponentRenderer(NodeRecommendationModal, {
	props: {
		modalName: EXPERIMENT_TEMPLATE_RECO_V2_KEY,
		data: {},
	},
	global: {
		stubs: {
			NodeIcon: true,
		},
	},
});

describe('NodeRecommendationModal', () => {
	beforeEach(() => {
		const modalsContainer = document.createElement('div');
		modalsContainer.id = APP_MODALS_ELEMENT_ID;
		document.body.appendChild(modalsContainer);
	});

	afterEach(() => {
		document.getElementById(APP_MODALS_ELEMENT_ID)?.remove();
	});

	it('builds "see more" links from the template repository parameters', async () => {
		const { findByText } = renderComponent({
			pinia: createTestingPinia({
				initialState: {
					[STORES.UI]: {
						modalsById: {
							[EXPERIMENT_TEMPLATE_RECO_V2_KEY]: { open: true },
						},
					},
				},
			}),
		});

		const starterLink = (await findByText('See more starter templates')).closest('a');
		expect(starterLink).toHaveAttribute(
			'href',
			'https://n8n.io/workflows/?utm_source=n8n_app&utm_instance=https%3A%2F%2Ftest.instance%2F&integrations=Slack&q=Simple',
		);

		const popularLink = (await findByText('See more popular templates')).closest('a');
		expect(popularLink).toHaveAttribute(
			'href',
			'https://n8n.io/workflows/?utm_source=n8n_app&utm_instance=https%3A%2F%2Ftest.instance%2F&integrations=Slack',
		);
	});
});
