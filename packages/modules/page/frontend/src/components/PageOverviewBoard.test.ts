import type { PageOverviewWorkflow } from '@n8n/api-types';
import { capabilities, capabilityRegistry, componentRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import type { Scope } from '@n8n/permissions';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { defineComponent, h } from 'vue';

import PageOverviewBoard from './PageOverviewBoard.vue';
import { createOverviewWorkflow, createPage } from '../__tests__/fixtures';
import { createTestRouter } from '../__tests__/router';

const api = vi.hoisted(() => ({
	getPageOverview: vi.fn(),
	createPage: vi.fn(),
}));

vi.mock('../page.api', () => api);

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost/rest', pushRef: 'test' } }),
}));

const runbook = {
	id: 'page-1',
	title: 'Runbook',
	excerpt: 'How it works.',
	hasTour: false,
	outdated: false,
};

const scheduled = createOverviewWorkflow({
	id: 'wf-report',
	name: 'Daily report',
	category: 'schedule',
	active: true,
	credentialTypes: ['slackApi'],
	pageCount: 3,
	page: { ...runbook, hasTour: true },
});
const webhook = createOverviewWorkflow({
	id: 'wf-refund',
	name: 'Refund API',
	category: 'webhook',
	credentialTypes: ['slackApi', 'stripeApi'],
});
const manual = createOverviewWorkflow({ id: 'wf-fix', name: 'Fix data', category: 'manual' });

function provideScopes(scopes: Scope[]) {
	capabilityRegistry.clear();
	capabilityRegistry.provide(capabilities.projectPermissions, {
		scopesFor: () => scopes,
		isReadOnly: () => false,
	});
}

async function renderBoard(
	workflows: PageOverviewWorkflow[],
	props: { projectId?: string; refreshIntervalMs?: number } = { projectId: 'project-1' },
) {
	api.getPageOverview.mockResolvedValue({ workflows });
	const router = createTestRouter();
	await router.push('/');
	const wrapper = createComponentRenderer(PageOverviewBoard)({
		props,
		global: { plugins: [router] },
	});
	await waitFor(() =>
		expect(
			[
				...wrapper.queryAllByTestId('page-overview-section'),
				...wrapper.queryAllByTestId('page-overview-no-workflows'),
			].length,
		).toBeGreaterThan(0),
	);
	return { wrapper, router };
}

const sectionLabels = (wrapper: Awaited<ReturnType<typeof renderBoard>>['wrapper']) =>
	wrapper
		.getAllByTestId('page-overview-section')
		.map((section) => section.getAttribute('aria-label'));

const cardNames = (wrapper: Awaited<ReturnType<typeof renderBoard>>['wrapper']) =>
	wrapper.getAllByTestId('page-overview-card-name').map((name) => name.textContent);

describe('PageOverviewBoard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		provideScopes(['page:create', 'page:list', 'page:read']);
		componentRegistry.clear();
	});

	afterEach(() => {
		capabilityRegistry.clear();
		componentRegistry.clear();
		vi.useRealTimers();
	});

	it('loads the overview of the project and groups the workflows by how they start', async () => {
		const { wrapper } = await renderBoard([manual, webhook, scheduled]);

		expect(api.getPageOverview).toHaveBeenCalledWith(expect.anything(), 'project-1');
		expect(sectionLabels(wrapper)).toEqual(['Scheduled', 'API and webhooks', 'Manual']);
		expect(cardNames(wrapper)).toEqual(['Daily report', 'Refund API', 'Fix data']);
	});

	it('shows no heading above the sections of a project', async () => {
		const { wrapper } = await renderBoard([manual, webhook, scheduled]);

		expect(wrapper.getAllByTestId('page-overview-section')).toHaveLength(3);
		expect(wrapper.queryByTestId('page-overview-section-label')).not.toBeInTheDocument();
		expect(wrapper.queryByTestId('page-overview-section-toggle')).not.toBeInTheDocument();
	});

	it('shows only the sections and their cards', async () => {
		const { wrapper } = await renderBoard([manual]);

		expect(wrapper.getByTestId('page-overview-board').children).toHaveLength(1);
		expect(wrapper.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
		expect(wrapper.queryByRole('progressbar')).not.toBeInTheDocument();
		expect(wrapper.queryByRole('textbox')).not.toBeInTheDocument();
		expect(wrapper.queryByRole('switch')).not.toBeInTheDocument();
	});

	describe('without a project', () => {
		const inProject = (projectId: string, projectName: string, count: number) =>
			Array.from({ length: count }, (_unused, index) =>
				createOverviewWorkflow({
					id: `${projectId}-wf-${index}`,
					name: `${projectName} ${index}`,
					projectId,
					projectName,
				}),
			);
		const documentedLast = createOverviewWorkflow({
			id: 'ops-documented',
			name: 'Ops documented',
			projectId: 'ops',
			projectName: 'Ops',
			page: runbook,
		});

		it('spans every readable project and groups by project', async () => {
			const { wrapper } = await renderBoard(
				[...inProject('sales', 'Sales', 2), ...inProject('ops', 'Ops', 1)],
				{},
			);

			expect(api.getPageOverview).toHaveBeenCalledWith(expect.anything(), undefined);
			expect(sectionLabels(wrapper)).toEqual(['Ops', 'Sales']);
			expect(wrapper.queryByTestId('page-overview-view-all')).not.toBeInTheDocument();
		});

		it('collapses and expands the cards of a project', async () => {
			const { wrapper } = await renderBoard(
				[...inProject('sales', 'Sales', 1), ...inProject('ops', 'Ops', 1)],
				{},
			);
			const [firstToggle, secondToggle] = wrapper.getAllByTestId('page-overview-section-toggle');
			expect(firstToggle).toHaveAttribute('aria-expanded', 'true');

			await fireEvent.click(firstToggle);

			expect(firstToggle).toHaveAttribute('aria-expanded', 'false');
			expect(secondToggle).toHaveAttribute('aria-expanded', 'true');
			expect(cardNames(wrapper)).toEqual(['Sales 0']);

			await fireEvent.click(firstToggle);

			expect(cardNames(wrapper)).toEqual(['Ops 0', 'Sales 0']);
		});

		it('shows at most 4 cards of a project, the documented first, then a tile for the rest', async () => {
			const { wrapper } = await renderBoard([...inProject('ops', 'Ops', 5), documentedLast], {});

			expect(cardNames(wrapper)).toEqual(['Ops documented', 'Ops 0', 'Ops 1', 'Ops 2']);
			expect(wrapper.getByTestId('page-overview-section')).toHaveTextContent('Ops6');
			const viewAll = wrapper.getByTestId('page-overview-view-all');
			expect(viewAll).toHaveTextContent('View all (6)');

			await fireEvent.click(viewAll);

			expect(wrapper.emitted('select-project')).toEqual([['ops']]);
			expect(wrapper.emitted('select-page')).toBeUndefined();
		});
	});

	describe('a documented card', () => {
		it('shows the workflow, its page and its node icons', async () => {
			const { wrapper } = await renderBoard([scheduled]);
			const card = wrapper.getByTestId('page-overview-card');

			expect(card).toHaveTextContent('Daily report');
			expect(within(card).getByTestId('page-overview-card-excerpt')).toHaveTextContent(
				'How it works.',
			);
			expect(within(card).getByTestId('page-overview-card-nodes').children).toHaveLength(2);
			expect(within(card).getByTestId('page-overview-card-trigger')).toHaveTextContent('Schedule');
			expect(within(card).queryByTestId('page-overview-card-fact')).not.toBeInTheDocument();
		});

		it('shows the key fact of the trigger on a documented card and on a card without a page', async () => {
			const { wrapper } = await renderBoard([
				{
					...scheduled,
					trigger: { kind: 'schedule', field: 'weeks', triggerAtDay: [1], triggerAtHour: 8 },
				},
				{ ...webhook, trigger: { kind: 'webhook', method: 'POST', path: 'acme/orders' } },
				manual,
			]);

			expect(
				wrapper.getAllByTestId('page-overview-card-fact').map((fact) => fact.textContent?.trim()),
			).toEqual(['Every week on Monday at 08:00', 'POST /acme/orders']);
			expect(
				wrapper
					.getAllByTestId('page-overview-card-trigger')
					.map((chip) => chip.textContent?.trim()),
			).toEqual(['Schedule', 'API', 'Manual']);
		});

		it('asks the host to show the page on a click on the card', async () => {
			const { wrapper } = await renderBoard([scheduled]);

			await fireEvent.click(wrapper.getByTestId('page-overview-card'));

			expect(wrapper.emitted('select-page')).toEqual([['page-1']]);
			expect(within(wrapper.getByTestId('page-overview-card')).queryByRole('button')).toBeNull();
		});

		it('marks a page that is older than its workflow', async () => {
			const { wrapper } = await renderBoard([
				{ ...scheduled, page: { ...runbook, outdated: true } },
				{ ...webhook, page: runbook },
			]);

			const stickers = wrapper.getAllByTestId('page-overview-outdated');

			expect(stickers).toHaveLength(1);
			expect(stickers[0]).toHaveTextContent('Outdated?');
			expect(stickers[0]).toHaveAttribute('aria-label', 'The workflow changed after this page');
		});

		it('shows the result of the last execution', async () => {
			const { wrapper } = await renderBoard([
				{
					...scheduled,
					lastExecution: { status: 'error', finishedAt: '2026-11-17T08:00:00.000Z' },
				},
				{
					...webhook,
					page: runbook,
					lastExecution: { status: 'success', finishedAt: '2026-11-17T08:00:00.000Z' },
				},
				manual,
			]);

			const [failed, succeeded] = wrapper.getAllByTestId('page-overview-health');

			expect(wrapper.getAllByTestId('page-overview-health')).toHaveLength(2);
			expect(failed).toHaveAttribute('aria-label', 'The last execution failed');
			expect(failed).toHaveAttribute('data-status', 'error');
			expect(succeeded).toHaveAttribute('aria-label', 'The last execution succeeded');
		});
	});

	describe('a card of a workflow without a page', () => {
		it('creates a page that links to the workflow on a click on the card, then asks the host to show it', async () => {
			api.createPage.mockResolvedValue(createPage({ id: 'page-9', title: 'Refund API' }));
			const { wrapper } = await renderBoard([webhook]);
			const card = wrapper.getByTestId('page-overview-card-undocumented');

			await fireEvent.click(card);

			await waitFor(() => expect(wrapper.emitted('select-page')).toEqual([['page-9']]));
			expect(api.createPage).toHaveBeenCalledWith(expect.anything(), 'project-1', {
				title: 'Refund API',
				content: 'Workflow: [Refund API](/workflow/wf-refund)\n\n',
			});
			expect(api.getPageOverview).toHaveBeenCalledTimes(2);
		});

		it('shows no excerpt', async () => {
			const { wrapper } = await renderBoard([webhook]);

			expect(wrapper.queryByTestId('page-overview-card-excerpt')).not.toBeInTheDocument();
		});

		it('opens the workflow for a user who cannot create a page', async () => {
			provideScopes(['page:list', 'page:read']);
			const { wrapper, router } = await renderBoard([webhook]);

			expect(wrapper.queryByTestId('page-overview-card-write')).not.toBeInTheDocument();
			await fireEvent.click(wrapper.getByTestId('page-overview-card-undocumented'));

			await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/workflow/wf-refund'));
			expect(api.createPage).not.toHaveBeenCalled();
			expect(wrapper.emitted('select-page')).toBeUndefined();
		});
	});

	it('tells when there is no workflow to document', async () => {
		const { wrapper } = await renderBoard([]);

		expect(wrapper.getByTestId('page-overview-no-workflows')).toBeInTheDocument();
		expect(wrapper.queryByTestId('page-overview-section')).not.toBeInTheDocument();
	});

	it('gives the undocumented workflows to the actions of the shell', async () => {
		const receivedProps = vi.fn();
		componentRegistry.register(
			'page-overview-actions',
			defineComponent({
				props: { projectId: String, undocumentedWorkflows: Array },
				setup(props) {
					return () => {
						receivedProps({ ...props });
						return h('button', 'Document all');
					};
				},
			}),
		);

		const { wrapper } = await renderBoard([manual, webhook, scheduled]);

		expect(wrapper.getByTestId('page-overview-actions')).toHaveTextContent('Document all');
		expect(receivedProps).toHaveBeenLastCalledWith({
			projectId: 'project-1',
			undocumentedWorkflows: [
				{ id: 'wf-fix', name: 'Fix data' },
				{ id: 'wf-refund', name: 'Refund API' },
			],
		});
	});

	it('shows no actions when the shell registers none', async () => {
		const { wrapper } = await renderBoard([manual]);

		expect(wrapper.queryByTestId('page-overview-actions')).not.toBeInTheDocument();
	});

	it('reloads the overview quietly at the requested interval', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const { wrapper } = await renderBoard([manual], {
			projectId: 'project-1',
			refreshIntervalMs: 5000,
		});
		api.getPageOverview.mockResolvedValue({ workflows: [manual, webhook] });

		await vi.advanceTimersByTimeAsync(5000);

		await waitFor(() => expect(cardNames(wrapper)).toEqual(['Refund API', 'Fix data']));
		expect(api.getPageOverview).toHaveBeenCalledTimes(2);
	});

	it('does not reload by itself without an interval', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		await renderBoard([manual]);

		await vi.advanceTimersByTimeAsync(60_000);

		expect(api.getPageOverview).toHaveBeenCalledTimes(1);
	});
});
