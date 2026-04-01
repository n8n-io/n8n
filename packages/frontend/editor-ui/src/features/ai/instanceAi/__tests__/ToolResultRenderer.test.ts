import { createComponentRenderer } from '@/__tests__/render';
import { describe, expect, it } from 'vitest';
import ToolResultRenderer from '../components/ToolResultRenderer.vue';

const renderComponent = createComponentRenderer(ToolResultRenderer, {
	global: {
		stubs: {
			ToolResultJson: { template: '<div data-test-id="json-renderer" />' },
			ToolResultTable: { template: '<div data-test-id="table-renderer" />' },
			ToolResultCode: { template: '<div data-test-id="code-renderer" />' },
			ToolResultMedia: { template: '<div data-test-id="media-renderer" />' },
			ToolResultText: { template: '<div data-test-id="text-renderer" />' },
		},
	},
});

describe('ToolResultRenderer', () => {
	it('falls back to JSON for non-tabular result payloads', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				toolName: 'choose-workflow-template',
				result: {
					selected: true,
					action: 'adapt_with_agent',
					templateId: 101,
					templateName: 'Slack alert triage',
				},
			},
		});

		expect(getByTestId('json-renderer')).toBeInTheDocument();
		expect(queryByTestId('table-renderer')).not.toBeInTheDocument();
	});

	it('still renders tables for list-like tools', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				toolName: 'list-workflows',
				result: {
					workflows: [{ id: 'wf-1', name: 'My workflow' }],
				},
			},
		});

		expect(getByTestId('table-renderer')).toBeInTheDocument();
		expect(queryByTestId('json-renderer')).not.toBeInTheDocument();
	});
});
