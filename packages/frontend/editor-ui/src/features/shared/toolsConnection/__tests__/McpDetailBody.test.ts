import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
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
					isOfficial: true,
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

	it('shows n8n as the maintainer when Gateway credits are selected', () => {
		const { getByText, getByTestId, queryByText } = renderComponent({
			props: {
				item: item({
					title: 'Brave Search',
					isOfficial: true,
					publisher: { name: 'Brave Search', url: 'https://brave.com' },
					version: '1.0.0',
					credentials: [
						{
							authType: 'n8nConnectBraveSearchMcpAiGatewayApi',
							credentialId: AI_GATEWAY_MANAGED_TAG,
							aiGateway: true,
						},
					],
				}),
			},
		});

		expect(getByText('Brave Search via Gateway credits')).toBeVisible();
		expect(queryByText('Official Brave Search MCP server')).toBeNull();
		expect(getByTestId('tools-connection-detail-metadata')).toHaveTextContent(
			'Maintained by n8n · Version 1.0.0',
		);
	});

	it('shows n8n as the maintainer of a gateway-only server before it is connected', () => {
		const { getByText, getByTestId } = renderComponent({
			props: {
				item: item({
					title: 'Brave Search',
					publisher: { name: 'Brave Search', url: 'https://brave.com' },
					credentials: [{ authType: 'n8nConnectBraveSearchMcpAiGatewayApi', aiGateway: true }],
				}),
			},
		});

		expect(getByText('Brave Search via Gateway credits')).toBeVisible();
		expect(getByTestId('tools-connection-detail-metadata')).toHaveTextContent('Maintained by n8n');
	});

	it('shows the publisher of a paired server until Gateway credits are selected', () => {
		const { getByText, getByTestId } = renderComponent({
			props: {
				item: item({
					title: 'Firecrawl',
					isOfficial: true,
					publisher: { name: 'Firecrawl', url: 'https://firecrawl.dev' },
					credentials: [
						{ authType: 'n8nConnectFirecrawlMcpAiGatewayApi', aiGateway: true },
						{ authType: 'firecrawlMcpOAuth2Api' },
					],
				}),
			},
		});

		expect(getByText('Official Firecrawl MCP server')).toBeVisible();
		expect(getByTestId('tools-connection-detail-metadata')).toHaveTextContent(
			'Published by Firecrawl',
		);
	});

	it('omits unavailable metadata and description rows', () => {
		const { getByText, queryByTestId } = renderComponent({
			props: { item: item() },
		});

		expect(getByText('Figma MCP server')).toBeVisible();
		expect(queryByTestId('tools-connection-detail-metadata')).not.toBeInTheDocument();
		expect(queryByTestId('tools-connection-detail-description')).not.toBeInTheDocument();
	});
});
