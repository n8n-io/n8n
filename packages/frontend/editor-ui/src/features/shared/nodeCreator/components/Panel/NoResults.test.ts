import { cleanup, fireEvent, screen } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import {
	REQUEST_NODE_FORM_URL,
	REGULAR_NODE_CREATOR_VIEW,
	TRIGGER_NODE_CREATOR_VIEW,
} from '@/app/constants';

import NoResults from './NoResults.vue';

const renderComponent = createComponentRenderer(NoResults, {
	global: {
		stubs: {
			NoResultsIcon: {
				template: '<div data-test-id="no-results-icon" />',
			},
			N8nIcon: {
				template: '<span data-test-id="n8n-icon" />',
				props: ['icon', 'title'],
			},
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

	it('should render icon only when showIcon is true', () => {
		renderComponent({ props: { showIcon: true } });
		expect(screen.getByTestId('no-results-icon')).toBeInTheDocument();

		cleanup();
		renderComponent({ props: { showIcon: false } });
		expect(screen.queryByTestId('no-results-icon')).not.toBeInTheDocument();
	});

	it('should render Regular view action and emit addHttpNode on click', async () => {
		const wrapper = renderComponent({
			props: { rootView: REGULAR_NODE_CREATOR_VIEW, showRequest: false, showIcon: false },
		});

		expect(screen.getByText('HTTP Request')).toBeInTheDocument();
		expect(screen.queryByText('Webhook')).not.toBeInTheDocument();

		await fireEvent.click(screen.getByText('HTTP Request'));
		expect(wrapper.emitted('addHttpNode')).toHaveLength(1);
	});

	it('should render Trigger view actions and emit addWebhookNode/addHttpNode on click', async () => {
		const wrapper = renderComponent({
			props: { rootView: TRIGGER_NODE_CREATOR_VIEW, showRequest: false, showIcon: false },
		});

		expect(screen.getByText('Webhook')).toBeInTheDocument();
		expect(screen.getByText('HTTP Request')).toBeInTheDocument();

		await fireEvent.click(screen.getByText('Webhook'));
		await fireEvent.click(screen.getByText('HTTP Request'));

		expect(wrapper.emitted('addWebhookNode')).toHaveLength(1);
		expect(wrapper.emitted('addHttpNode')).toHaveLength(1);
	});

	it('should render request section when showRequest is true, linking to the request form', () => {
		renderComponent({ props: { showRequest: true, showIcon: false } });

		expect(screen.getByText('Want us to make it faster?')).toBeInTheDocument();
		const link = screen.getByText('Request the node').closest('a');
		expect(link).toHaveAttribute('href', REQUEST_NODE_FORM_URL);
	});
});
