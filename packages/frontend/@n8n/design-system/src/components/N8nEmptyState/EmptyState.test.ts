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
			expect(wrapper.container.querySelector('[data-icon="code"]')).toBeInTheDocument();
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
