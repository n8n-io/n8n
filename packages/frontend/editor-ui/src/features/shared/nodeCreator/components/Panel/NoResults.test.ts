import { cleanup, fireEvent, screen } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import {
	AI_OTHERS_NODE_CREATOR_VIEW,
	REGULAR_NODE_CREATOR_VIEW,
	TRIGGER_NODE_CREATOR_VIEW,
} from '@/app/constants';

import NoResults from './NoResults.vue';

const renderComponent = createComponentRenderer(NoResults, {
	global: {
		stubs: {
			N8nLink: {
				template:
					'<a :href="href" data-test-id="n8n-link" @click="$emit(\'click\', $event)"><slot /></a>',
				props: ['to'],
				emits: ['click'],
				computed: {
					href() {
						return typeof this.to === 'string' ? this.to : '#';
					},
				},
			},
		},
	},
});

describe('NoResults', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders the search query and HTTP Request guidance', () => {
		renderComponent({ props: { query: 'Gmail MCP', rootView: REGULAR_NODE_CREATOR_VIEW } });

		expect(screen.getByText('No results for "Gmail MCP"')).toBeInTheDocument();
		expect(screen.getByTestId('node-creator-no-results')).toHaveTextContent(
			'Connect to almost any service or API using our HTTP Request node',
		);
	});

	it('emits addHttpNode when the HTTP Request link is clicked', async () => {
		const wrapper = renderComponent({
			props: { query: 'Gmail MCP', rootView: REGULAR_NODE_CREATOR_VIEW },
		});

		await fireEvent.click(screen.getByText('HTTP Request'));
		expect(wrapper.emitted('addHttpNode')).toHaveLength(1);
	});

	it('also suggests a Webhook node for trigger searches', async () => {
		const wrapper = renderComponent({
			props: { query: 'Gmail MCP', rootView: TRIGGER_NODE_CREATOR_VIEW },
		});

		await fireEvent.click(screen.getByText('Webhook'));

		expect(wrapper.emitted('addWebhookNode')).toHaveLength(1);
		expect(screen.getByText('HTTP Request')).toBeInTheDocument();
		expect(screen.getByTestId('node-creator-no-results')).toHaveTextContent(
			/Webhook or HTTP Request/,
		);
	});

	it('does not suggest incompatible nodes in specialized AI views', () => {
		renderComponent({
			props: { query: 'Gmail MCP', rootView: AI_OTHERS_NODE_CREATOR_VIEW },
		});

		expect(screen.getByText('No results for "Gmail MCP"')).toBeInTheDocument();
		expect(screen.queryByText('Webhook')).not.toBeInTheDocument();
		expect(screen.queryByText('HTTP Request')).not.toBeInTheDocument();
	});
});
