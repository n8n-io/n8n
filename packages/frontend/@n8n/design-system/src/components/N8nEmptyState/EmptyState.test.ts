import userEvent from '@testing-library/user-event';
import { render, waitFor, within } from '@testing-library/vue';

import N8nEmptyState from './EmptyState.vue';

const stubs = ['N8nText', 'N8nButton', 'N8nIcon'];

describe('N8nEmptyState', () => {
	describe('rendering', () => {
		it('should render correctly with an icon cluster', () => {
			const wrapper = render(N8nEmptyState, {
				props: {
					iconCluster: ['key-round', 'circle-ellipsis', 'vault'],
					title: 'Add an external secrets store',
					description: 'Manage credentials across multiple environments.',
					buttonText: 'Add secrets store',
					learnMoreUrl: 'https://docs.n8n.io/external-secrets/',
				},
				global: { stubs },
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render title and description text', () => {
			const wrapper = render(N8nEmptyState, {
				props: {
					title: 'Nothing here yet',
					description: 'Add your first item to get started.',
				},
			});
			expect(wrapper.getByText('Nothing here yet')).toBeInTheDocument();
			expect(wrapper.getByText('Add your first item to get started.')).toBeInTheDocument();
		});

		it('should render a single icon tile', () => {
			const wrapper = render(N8nEmptyState, {
				props: { icon: 'tree-pine', title: 'Empty' },
			});
			const cluster = wrapper.getByTestId('empty-state-cluster');
			const icons = cluster.querySelectorAll('[data-icon]');
			expect(icons).toHaveLength(1);
			expect(icons[0]).toHaveAttribute('data-icon', 'tree-pine');
		});

		it('should render the icon cluster tiles', () => {
			const wrapper = render(N8nEmptyState, {
				props: { iconCluster: ['key-round', 'circle-ellipsis', 'vault'], title: 'Empty' },
			});
			const cluster = wrapper.getByTestId('empty-state-cluster');
			const icons = cluster.querySelectorAll('[data-icon]');
			expect(icons).toHaveLength(3);
			expect(cluster.querySelector('[data-icon="key-round"]')).toBeInTheDocument();
			expect(cluster.querySelector('[data-icon="circle-ellipsis"]')).toBeInTheDocument();
			expect(cluster.querySelector('[data-icon="vault"]')).toBeInTheDocument();
		});

		it('should not render an actions row when no actions are provided', () => {
			const wrapper = render(N8nEmptyState, {
				props: { title: 'Empty', description: 'No actions here.' },
			});
			expect(wrapper.queryByTestId('empty-state-button')).not.toBeInTheDocument();
			expect(wrapper.queryByTestId('empty-state-learn-more')).not.toBeInTheDocument();
		});

		it('should render a dashed panel by default', () => {
			const wrapper = render(N8nEmptyState, { props: { title: 'Empty' } });
			expect(wrapper.getByTestId('empty-state').className).toContain('bordered');
		});

		it('should drop the dashed panel when bordered is false', () => {
			const wrapper = render(N8nEmptyState, {
				props: { title: 'Empty', bordered: false },
			});
			expect(wrapper.getByTestId('empty-state').className).not.toContain('bordered');
		});

		it('should expose the variant via a data attribute', () => {
			const wrapper = render(N8nEmptyState, {
				props: { title: 'Gated', variant: 'gated' },
			});
			expect(wrapper.getByTestId('empty-state')).toHaveAttribute('data-variant', 'gated');
		});
	});

	describe('actions', () => {
		it('should emit click:button when the primary button is clicked', async () => {
			const wrapper = render(N8nEmptyState, {
				props: { title: 'Empty', buttonText: 'Add secrets store' },
			});

			await userEvent.click(wrapper.getByTestId('empty-state-button'));

			await waitFor(() => {
				expect(wrapper.emitted('click:button')).toHaveLength(1);
			});
		});

		it('should not emit click:button when the primary button is disabled', async () => {
			const wrapper = render(N8nEmptyState, {
				props: { title: 'Empty', buttonText: 'Add secrets store', buttonDisabled: true },
			});

			await userEvent.click(wrapper.getByTestId('empty-state-button'));

			expect(wrapper.emitted('click:button')).toBeUndefined();
		});

		it('should render a learn more link that opens in a new tab', () => {
			const wrapper = render(N8nEmptyState, {
				props: {
					title: 'Empty',
					learnMoreUrl: 'https://docs.n8n.io/external-secrets/',
					learnMoreText: 'Learn more',
				},
			});

			const link = wrapper.getByTestId('empty-state-learn-more');
			expect(link.tagName).toBe('A');
			expect(link).toHaveAttribute('href', 'https://docs.n8n.io/external-secrets/');
			expect(link).toHaveAttribute('target', '_blank');
			expect(within(link).getByText('Learn more')).toBeInTheDocument();
		});
	});

	describe('slots', () => {
		it('should render the visual slot instead of the icon cluster', () => {
			const wrapper = render(N8nEmptyState, {
				props: { icon: 'tree-pine', title: 'Empty' },
				slots: { visual: '<span data-test-id="custom-visual">custom</span>' },
			});
			expect(wrapper.getByTestId('custom-visual')).toBeInTheDocument();
			expect(wrapper.queryByTestId('empty-state-cluster')).not.toBeInTheDocument();
		});

		it('should render the title and description slots', () => {
			const wrapper = render(N8nEmptyState, {
				slots: {
					title: '<span data-test-id="custom-title">Custom title</span>',
					description: '<span data-test-id="custom-description">Custom description</span>',
				},
			});
			expect(wrapper.getByTestId('custom-title')).toBeInTheDocument();
			expect(wrapper.getByTestId('custom-description')).toBeInTheDocument();
		});

		it('should render the actions slot instead of the default buttons', () => {
			const wrapper = render(N8nEmptyState, {
				props: { title: 'Empty', buttonText: 'Add secrets store' },
				slots: { actions: '<button data-test-id="custom-action">Custom</button>' },
			});
			expect(wrapper.getByTestId('custom-action')).toBeInTheDocument();
			expect(wrapper.queryByTestId('empty-state-button')).not.toBeInTheDocument();
		});

		it('should render the additionalContent slot', () => {
			const wrapper = render(N8nEmptyState, {
				props: { title: 'Empty' },
				slots: { additionalContent: '<span data-test-id="extra">Extra</span>' },
			});
			expect(wrapper.getByTestId('extra')).toBeInTheDocument();
		});
	});
});
