import { createComponentRenderer } from '@n8n/frontend-test-utils';
import type { INode } from 'n8n-workflow';

import HtmlDisplayModeView from './HtmlDisplayModeView.vue';

const node: INode = {
	id: '1',
	name: 'HTML',
	type: 'n8n-nodes-base.html',
	typeVersion: 1.2,
	position: [0, 0],
	parameters: { operation: 'generateHtmlTemplate' },
};

const renderComponent = createComponentRenderer(HtmlDisplayModeView, {
	props: {
		data: [],
		node,
		pane: 'output',
		runIndex: 0,
		outputIndex: 0,
		search: '',
		compact: false,
	},
});

describe('HtmlDisplayModeView', () => {
	it('renders the html of the first item', () => {
		const { container } = renderComponent({
			props: {
				data: [{ json: { html: '<h1>First</h1>' } }, { json: { html: '<h1>Second</h1>' } }],
			},
		});

		expect(container.querySelector('iframe')).toHaveAttribute('srcdoc', '<h1>First</h1>');
	});

	it('renders an empty preview when there is no item', () => {
		const { container } = renderComponent();

		expect(container.querySelector('iframe')).toHaveAttribute('srcdoc', '');
	});
});
