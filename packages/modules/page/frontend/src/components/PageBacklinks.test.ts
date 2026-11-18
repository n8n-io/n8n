import type { PageBacklinks as Backlinks } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { within } from '@testing-library/vue';

import PageBacklinks from './PageBacklinks.vue';
import { createPage } from '../__tests__/fixtures';
import { createTestRouter } from '../__tests__/router';

vi.mock('../resources/resource.api', () => ({
	createRestResourceFetchers: () => ({
		workflow: vi.fn().mockRejectedValue(new Error('Not loaded')),
		credential: vi.fn(),
		dataTable: vi.fn(),
		page: vi.fn().mockRejectedValue(new Error('Not loaded')),
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost/rest', pushRef: 'test' } }),
}));

const renderBacklinks = createComponentRenderer(PageBacklinks);

function toSummary({ content: _content, ...summary }: ReturnType<typeof createPage>) {
	return summary;
}

function renderWith(backlinks: Backlinks) {
	return renderBacklinks({ props: { backlinks }, global: { plugins: [createTestRouter()] } });
}

const onCanvas = {
	workflowId: 'wf-1',
	workflowName: 'Sync orders',
	nodeId: 'sticky-1',
	nodeName: 'Sticky Note',
};

describe('PageBacklinks', () => {
	it('renders nothing when nothing links to the page', () => {
		const { queryByTestId } = renderWith({ pages: [], workflows: [] });

		expect(queryByTestId('page-backlinks')).not.toBeInTheDocument();
	});

	it('links to each workflow that shows the page on its canvas', () => {
		const { getByTestId, getAllByTestId, queryByTestId } = renderWith({
			pages: [],
			workflows: [onCanvas, { ...onCanvas, workflowId: 'wf-2', workflowName: 'Billing' }],
		});

		const rows = getAllByTestId('page-backlinks-workflow');
		expect(getByTestId('page-backlinks')).toHaveTextContent('On canvas');
		expect(rows).toHaveLength(2);
		expect(rows[0]).toHaveTextContent('Sync orders');
		expect(within(rows[0]).getByRole('link')).toHaveAttribute('href', '/workflow/wf-1');
		expect(queryByTestId('page-backlinks-page')).not.toBeInTheDocument();
	});

	it('shows one chip for a workflow with two sticky notes of the page', () => {
		const { getAllByTestId } = renderWith({
			pages: [],
			workflows: [onCanvas, { ...onCanvas, nodeId: 'sticky-2' }],
		});

		expect(getAllByTestId('page-backlinks-workflow')).toHaveLength(1);
	});

	it('links to each page that mentions the page', () => {
		const { getByTestId, getAllByTestId } = renderWith({
			pages: [toSummary(createPage({ id: 'page-2', title: 'Notes' }))],
			workflows: [],
		});

		const rows = getAllByTestId('page-backlinks-page');
		expect(getByTestId('page-backlinks')).toHaveTextContent('Mentioned in');
		expect(rows).toHaveLength(1);
		expect(rows[0]).toHaveTextContent('Notes');
		expect(within(rows[0]).getByRole('link')).toHaveAttribute('href', '/page/page-2');
	});
});
