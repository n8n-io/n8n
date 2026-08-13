import { createTestingPinia } from '@pinia/testing';
import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type * as VueRouter from 'vue-router';
import { createComponentRenderer } from '@/__tests__/render';
import ResourceCenterView from '../ResourceCenterView.vue';

const mocks = vi.hoisted(() => ({
	trackResourceCenterView: vi.fn(),
	loadTemplates: vi.fn(),
	trackTileClick: vi.fn(),
	createAndOpenQuickStartWorkflow: vi.fn(),
	getTemplateRoute: vi.fn((id: number) => ({ name: 'template', params: { id } })),
	routerPush: vi.fn(),
	documentTitleSet: vi.fn(),
}));

vi.mock('../../stores/resourceCenter.store', () => ({
	useResourceCenterStore: () => ({
		trackResourceCenterView: mocks.trackResourceCenterView,
		loadTemplates: mocks.loadTemplates,
		trackTileClick: mocks.trackTileClick,
		createAndOpenQuickStartWorkflow: mocks.createAndOpenQuickStartWorkflow,
		getTemplateRoute: mocks.getTemplateRoute,
	}),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({
		set: mocks.documentTitleSet,
	}),
}));

vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal<typeof VueRouter>();

	return {
		...actual,
		useRouter: () => ({
			push: mocks.routerPush,
		}),
	};
});

const renderComponent = createComponentRenderer(ResourceCenterView, {
	pinia: createTestingPinia({ createSpy: vi.fn }),
	global: {
		stubs: {
			ResourceCard: {
				props: ['item'],
				emits: ['click'],
				template:
					'<button data-testid="resource-card" type="button" @click="$emit(\'click\')"><span>{{ item.title }}</span><span v-if="item.nodeCount !== undefined" data-testid="resource-card-node-count">{{ item.nodeCount }}</span><span v-if="item.setupTime" data-testid="resource-card-setup-time">{{ item.setupTime }}</span></button>',
			},
			ResourceFeatureCard: {
				props: ['item', 'tone'],
				emits: ['click'],
				template:
					'<button data-testid="resource-feature-card" type="button" @click="$emit(\'click\')">{{ item.title }}</button>',
			},
			N8nIcon: true,
			N8nSpinner: true,
		},
	},
});

describe('ResourceCenterView', () => {
	let windowOpenSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		mocks.trackResourceCenterView.mockReset();
		mocks.loadTemplates.mockReset();
		mocks.trackTileClick.mockReset();
		mocks.createAndOpenQuickStartWorkflow.mockReset();
		mocks.getTemplateRoute.mockClear();
		mocks.routerPush.mockReset();
		mocks.documentTitleSet.mockReset();
		mocks.loadTemplates
			.mockResolvedValueOnce([
				{
					id: 10427,
					description: 'Automatically analyse ad performance',
					nodes: [
						{ name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest', icon: 'file:http.svg' },
					],
					workflowInfo: {
						nodeCount: 7,
						nodeTypes: {},
					},
				},
			])
			.mockResolvedValueOnce([
				{
					id: 8527,
					description: 'Learn the basics',
					nodes: [
						{
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							icon: 'file:manual.svg',
						},
					],
					workflowInfo: {
						nodeCount: 2,
						nodeTypes: {},
					},
				},
			]);
		windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
	});

	afterEach(() => {
		windowOpenSpy.mockRestore();
	});

	it('tracks a page view on mount', async () => {
		renderComponent();

		await waitFor(() => expect(mocks.trackResourceCenterView).toHaveBeenCalledTimes(1));
		expect(mocks.documentTitleSet).toHaveBeenCalledWith('Resource Center');
	});

	it('tracks and starts quick-start workflows when their card is clicked', async () => {
		renderComponent();

		await userEvent.click(await screen.findByText('AI Workflow: Summarize the news'));

		expect(mocks.trackTileClick).toHaveBeenCalledWith(
			'quick-start',
			'ready-to-run',
			'summarize-the-news',
		);
		expect(mocks.createAndOpenQuickStartWorkflow).toHaveBeenCalledWith('summarize-the-news');
	});

	it('tracks video clicks and opens them in a new tab', async () => {
		renderComponent();

		const inspirationSection = (await screen.findByText('Get Inspired')).closest('section');
		expect(inspirationSection).toBeDefined();

		const inspirationCards = await within(inspirationSection!).findAllByRole('button');
		await fireEvent.click(inspirationCards[1]);

		await waitFor(() =>
			expect(mocks.trackTileClick).toHaveBeenCalledWith('inspiration', 'video', 'jPea9Sp9xYQ'),
		);
		await waitFor(() =>
			expect(windowOpenSpy).toHaveBeenCalledWith(
				'https://www.youtube.com/watch?v=jPea9Sp9xYQ',
				'_blank',
				'noopener,noreferrer',
			),
		);
	});

	it('tracks template clicks and routes to the template page', async () => {
		renderComponent();

		await userEvent.click(await screen.findByText('Analyse Facebook Ads automatically'));

		expect(mocks.trackTileClick).toHaveBeenCalledWith('inspiration', 'template', 10427);
		expect(mocks.getTemplateRoute).toHaveBeenCalledWith(10427);
		expect(mocks.routerPush).toHaveBeenCalledWith({
			name: 'template',
			params: { id: 10427 },
		});
	});

	it('uses workflow metadata for template card node counts and setup time', async () => {
		renderComponent();

		const inspirationSection = (await screen.findByText('Get Inspired')).closest('section');
		expect(inspirationSection).toBeDefined();

		const inspirationCards = await within(inspirationSection!).findAllByRole('button');
		const templateCard = inspirationCards[0];

		expect(
			templateCard.querySelector('[data-testid="resource-card-node-count"]'),
		).toHaveTextContent('7');
		expect(
			templateCard.querySelector('[data-testid="resource-card-setup-time"]'),
		).toHaveTextContent('12 min');
	});
});
