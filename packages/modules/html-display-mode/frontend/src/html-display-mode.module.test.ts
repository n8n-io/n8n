import type { RunDataDisplayModePane } from '@n8n/frontend-module-sdk';
import type { INode } from 'n8n-workflow';

import { HtmlDisplayModeModule } from './html-display-mode.module';

const [htmlMode] = HtmlDisplayModeModule.runDataDisplayModes ?? [];

const canRender = (pane: RunDataDisplayModePane, node: Partial<INode>) =>
	htmlMode.canRender({
		pane,
		data: [],
		node: {
			id: '1',
			name: 'Node',
			type: 'n8n-nodes-base.html',
			typeVersion: 1.2,
			position: [0, 0],
			parameters: { operation: 'generateHtmlTemplate' },
			...node,
		},
	});

describe('HtmlDisplayModeModule', () => {
	it('renders the output of an HTML node that generates a template', () => {
		expect(canRender('output', {})).toBe(true);
	});

	it.each<[string, RunDataDisplayModePane, Partial<INode>]>([
		['the input pane', 'input', {}],
		['another node type', 'output', { type: 'n8n-nodes-base.code' }],
		['another operation', 'output', { parameters: { operation: 'extractHtmlContent' } }],
	])('does not render for %s', (_case, pane, node) => {
		expect(canRender(pane, node)).toBe(false);
	});
});
