import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { defineComponent, h, nextTick } from 'vue';

import N8nEmptyState from './EmptyState.vue';

const StubMark = defineComponent({
	name: 'StubMark',
	render: () => h('svg', { 'data-test-id': 'stub-mark' }),
});

describe('N8nEmptyState', () => {
	it('should render correctly with emoji', () => {
		const wrapper = render(N8nEmptyState, {
			props: {
				icon: { type: 'emoji', value: '😿' },
				heading: 'Headline you need to know',
				description:
					'Long description that you should know something is the way it is because of how it is. ',
				buttonText: 'Do something',
				buttonVariant: 'solid',
			},
			global: {
				stubs: ['N8nHeading', 'N8nText', 'N8nButton', 'N8nCallout', 'N8nTooltip'],
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly with icon', () => {
		const wrapper = render(N8nEmptyState, {
			props: {
				icon: { type: 'icon', value: 'plus' },
				heading: 'Add something new',
				description: 'Click the button to add a new item.',
				buttonText: 'Add Item',
				buttonVariant: 'solid',
			},
			global: {
				stubs: ['N8nHeading', 'N8nText', 'N8nButton', 'N8nCallout', 'N8nIcon', 'N8nTooltip'],
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	describe('small size', () => {
		// The tooltip stays real: its stub drops the button that it wraps.
		const stubs = ['N8nHeading', 'N8nText', 'N8nButton', 'N8nCallout', 'N8nIcon'];

		it('should render correctly', () => {
			const wrapper = render(N8nEmptyState, {
				props: {
					size: 'small',
					description: 'No rows match the search and filter.',
					buttonText: 'Clear search and filter',
				},
				global: { stubs },
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render a small outline button', () => {
			const { container } = render(N8nEmptyState, {
				props: { size: 'small', buttonText: 'Clear search and filter' },
				global: { stubs },
			});
			const button = container.querySelector('n8n-button-stub');
			expect(button).toHaveAttribute('size', 'small');
			expect(button).toHaveAttribute('variant', 'outline');
		});

		it('should use the button variant that the caller sets', () => {
			const { container } = render(N8nEmptyState, {
				props: { size: 'small', buttonText: 'Retry', buttonVariant: 'solid' },
				global: { stubs },
			});
			expect(container.querySelector('n8n-button-stub')).toHaveAttribute('variant', 'solid');
		});

		it('should render the heading at medium size and the icon at 24px', () => {
			const { container } = render(N8nEmptyState, {
				props: { size: 'small', heading: 'No matches', icon: { type: 'icon', value: 'search' } },
				global: { stubs },
			});
			expect(container.querySelector('n8n-heading-stub')).toHaveAttribute('size', 'medium');
			expect(container.querySelector('n8n-icon-stub')).toHaveAttribute('size', '24');
		});

		it('should emit click:button when the button is clicked', async () => {
			const wrapper = render(N8nEmptyState, {
				props: { size: 'small', buttonText: 'Clear search and filter' },
			});
			await userEvent.click(wrapper.getByRole('button', { name: 'Clear search and filter' }));
			expect(wrapper.emitted('click:button')).toHaveLength(1);
		});

		it('should keep the large button and the xlarge heading at the default size', () => {
			const { container } = render(N8nEmptyState, {
				props: { heading: 'Headline', buttonText: 'Do something' },
				global: { stubs },
			});
			const button = container.querySelector('n8n-button-stub');
			expect(button).toHaveAttribute('size', 'large');
			expect(button).toHaveAttribute('variant', 'solid');
			expect(container.querySelector('n8n-heading-stub')).toHaveAttribute('size', 'xlarge');
		});
	});

	describe('icon cards variant', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should render the centre icon and the first side icons, supporting custom components', async () => {
			const wrapper = render(N8nEmptyState, {
				props: {
					icon: {
						type: 'cards',
						center: 'tree-pine',
						sides: [StubMark, 'code', 'terminal'],
					},
					heading: 'Connect assistants',
				},
				global: {
					stubs: ['N8nHeading', 'N8nText', 'N8nButton', 'N8nCallout', 'N8nTooltip'],
				},
			});

			// Card positions are (re-)initialised in onMounted, so flush the resulting patch.
			await nextTick();
			expect(wrapper.container.querySelector('[data-icon="tree-pine"]')).toBeInTheDocument();
			expect(wrapper.getByTestId('stub-mark')).toBeInTheDocument();
			// The right card starts halfway around the list, rounding up.
			expect(wrapper.container.querySelector('[data-icon="terminal"]')).toBeInTheDocument();
			expect(wrapper.container.querySelector('[data-icon="code"]')).not.toBeInTheDocument();
		});

		it('should start cycling shortly after mount, alternating sides', async () => {
			const wrapper = render(N8nEmptyState, {
				props: {
					icon: {
						type: 'cards',
						center: 'tree-pine',
						sides: ['code', 'terminal', 'bot', 'globe'],
					},
				},
				global: {
					stubs: ['N8nHeading', 'N8nText', 'N8nButton', 'N8nCallout', 'N8nTooltip'],
				},
			});

			const hasIcon = (name: string) =>
				wrapper.container.querySelector(`[data-icon="${name}"]`) !== null;

			// Left card starts at the first icon, right card halfway around the list.
			expect(hasIcon('code')).toBe(true);
			expect(hasIcon('bot')).toBe(true);

			// Half a beat (750ms) plus the fade (300ms): the left card has swapped, the right has not.
			await vi.advanceTimersByTimeAsync(1100);
			expect(hasIcon('code')).toBe(false);
			expect(hasIcon('terminal')).toBe(true);
			expect(hasIcon('bot')).toBe(true);

			// One beat (1.5s) later the right card follows while the left one holds.
			await vi.advanceTimersByTimeAsync(1500);
			expect(hasIcon('bot')).toBe(false);
			expect(hasIcon('globe')).toBe(true);
			expect(hasIcon('terminal')).toBe(true);
		});

		it('should never show the same icon on both side cards, even with three icons', async () => {
			const wrapper = render(N8nEmptyState, {
				props: {
					icon: {
						type: 'cards',
						center: 'tree-pine',
						sides: ['code', 'terminal', 'bot'],
					},
				},
				global: {
					stubs: ['N8nHeading', 'N8nText', 'N8nButton', 'N8nCallout', 'N8nTooltip'],
				},
			});

			const sideIcons = () =>
				Array.from(wrapper.container.querySelectorAll('[data-icon]'))
					.map((el) => el.getAttribute('data-icon'))
					.filter((name) => name !== 'tree-pine');

			await nextTick();
			expect(sideIcons()).toEqual(['code', 'bot']);

			// Lead-in plus fade lands the first swap; then step through a whole cycle (six
			// alternating swaps bring both cards back to their opening icons).
			await vi.advanceTimersByTimeAsync(1100);
			for (let swap = 1; swap <= 6; swap++) {
				const icons = sideIcons();
				expect(icons).toHaveLength(2);
				expect(new Set(icons).size).toBe(2);
				if (swap < 6) await vi.advanceTimersByTimeAsync(1500);
			}
			expect(sideIcons()).toEqual(['code', 'bot']);
		});

		it('should not cycle when animated is false', async () => {
			const wrapper = render(N8nEmptyState, {
				props: {
					icon: {
						type: 'cards',
						center: 'tree-pine',
						sides: ['code', 'terminal', 'bot', 'globe'],
						animated: false,
					},
				},
				global: {
					stubs: ['N8nHeading', 'N8nText', 'N8nButton', 'N8nCallout', 'N8nTooltip'],
				},
			});

			await nextTick();
			expect(wrapper.container.querySelector('[data-icon="code"]')).toBeInTheDocument();
			expect(wrapper.container.querySelector('[data-icon="terminal"]')).toBeInTheDocument();

			await vi.advanceTimersByTimeAsync(7000);
			expect(wrapper.container.querySelector('[data-icon="code"]')).toBeInTheDocument();
			expect(wrapper.container.querySelector('[data-icon="terminal"]')).toBeInTheDocument();
		});
	});
});
