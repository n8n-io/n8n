import { cleanup, fireEvent, screen } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import {
	AI_OTHERS_NODE_CREATOR_VIEW,
	REGULAR_NODE_CREATOR_VIEW,
	TRIGGER_NODE_CREATOR_VIEW,
} from '@/app/constants';

import NoResults from './NoResults.vue';

const customActions = vi.hoisted(() => ({
	allowed: false,
	startHttpActionDraft: vi.fn(),
}));

vi.mock('@n8n/frontend-module-next-nodes-instance', () => ({
	canMakeHttpActions: () => customActions.allowed,
	HTTP_ACTION_VIEW: 'http-action',
	startHttpActionDraft: customActions.startHttpActionDraft,
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ resolve: () => ({ href: '/settings/nodes/new' }) }),
}));

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
		customActions.allowed = false;
	});

	it('offers a custom action for the search, to a user who can make one', async () => {
		customActions.allowed = true;
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		renderComponent({ props: { query: ' Acme ', rootView: REGULAR_NODE_CREATOR_VIEW } });

		await fireEvent.click(screen.getByTestId('node-creator-make-custom-action'));

		expect(customActions.startHttpActionDraft).toHaveBeenCalledWith('Acme');
		expect(open).toHaveBeenCalledWith('/settings/nodes/new', '_blank');
	});

	it('offers no custom action in the trigger view, or without the right', () => {
		customActions.allowed = true;
		renderComponent({ props: { query: 'Acme', rootView: TRIGGER_NODE_CREATOR_VIEW } });
		expect(screen.queryByTestId('node-creator-make-custom-action')).not.toBeInTheDocument();
		cleanup();
		customActions.allowed = false;
		renderComponent({ props: { query: 'Acme', rootView: REGULAR_NODE_CREATOR_VIEW } });
		expect(screen.queryByTestId('node-creator-make-custom-action')).not.toBeInTheDocument();
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

	it('keeps the Webhook suggestion when only HTTP Request is restricted', async () => {
		const wrapper = renderComponent({
			props: { query: 'Gmail MCP', rootView: TRIGGER_NODE_CREATOR_VIEW, suggestHttpRequest: false },
		});

		expect(screen.queryByText('HTTP Request')).not.toBeInTheDocument();
		expect(screen.getByTestId('node-creator-no-results')).toHaveTextContent(/our Webhook node/);

		await fireEvent.click(screen.getByText('Webhook'));
		expect(wrapper.emitted('addWebhookNode')).toHaveLength(1);
	});

	it('keeps the HTTP Request suggestion when only Webhook is restricted', async () => {
		const wrapper = renderComponent({
			props: { query: 'Gmail MCP', rootView: TRIGGER_NODE_CREATOR_VIEW, suggestWebhook: false },
		});

		expect(screen.queryByText('Webhook')).not.toBeInTheDocument();
		expect(screen.getByTestId('node-creator-no-results')).toHaveTextContent(
			/our HTTP Request node/,
		);

		await fireEvent.click(screen.getByText('HTTP Request'));
		expect(wrapper.emitted('addHttpNode')).toHaveLength(1);
	});

	it('hides the suggestion line when both nodes are restricted', () => {
		renderComponent({
			props: {
				query: 'Gmail MCP',
				rootView: TRIGGER_NODE_CREATOR_VIEW,
				suggestHttpRequest: false,
				suggestWebhook: false,
			},
		});

		expect(screen.getByText('No results for "Gmail MCP"')).toBeInTheDocument();
		expect(screen.queryByText('Webhook')).not.toBeInTheDocument();
		expect(screen.queryByText('HTTP Request')).not.toBeInTheDocument();
		expect(screen.getByTestId('node-creator-no-results')).not.toHaveTextContent(
			'Connect to almost any service',
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
