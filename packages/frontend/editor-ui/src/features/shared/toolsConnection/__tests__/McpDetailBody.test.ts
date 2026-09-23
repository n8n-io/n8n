import { createComponentRenderer } from '@/__tests__/render';
import McpDetailBody from '../McpDetailBody.vue';
import type { McpServerConnectionItem } from '../types';

const renderComponent = createComponentRenderer(McpDetailBody);

function item(overrides: Partial<McpServerConnectionItem> = {}): McpServerConnectionItem {
	return {
		id: 'figma',
		kind: 'mcp-server',
		title: 'Figma',
		status: 'connected',
		availableTools: [],
		...overrides,
	};
}

describe('McpDetailBody', () => {
	it('renders the server identity, metadata, and capability in the design order', () => {
		const { getByText, getByTestId } = renderComponent({
			props: {
				item: item({
					publisher: { name: 'Figma', url: 'https://www.figma.com' },
					version: '2.21',
					longDescription: 'Search, read, and update your Figma projects and files',
				}),
			},
		});

		expect(getByText('Official Figma MCP server')).toBeVisible();
		expect(getByTestId('tools-connection-detail-metadata')).toHaveTextContent(
			'Published by Figma · Version 2.21',
		);
		expect(getByText('Figma')).toHaveAttribute('href', 'https://www.figma.com');
		expect(getByText('Search, read, and update your Figma projects and files')).toBeVisible();
	});

	it('omits unavailable metadata and description rows', () => {
		const { getByText, queryByTestId } = renderComponent({
			props: { item: item() },
		});

		expect(getByText('Official Figma MCP server')).toBeVisible();
		expect(queryByTestId('tools-connection-detail-metadata')).not.toBeInTheDocument();
	});
});
