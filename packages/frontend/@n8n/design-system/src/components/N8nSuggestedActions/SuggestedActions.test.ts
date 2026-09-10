import { render, fireEvent } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';

import N8nSuggestedActions from './SuggestedActions.vue';

const mockActions = [
	{
		id: 'action1',
		title: 'Evaluate your workflow',
		description: 'Set up an AI evaluation to be sure th WF is reliable.',
		moreInfoLink: 'https://docs.n8n.io/evaluations',
	},
	{
		id: 'action2',
		title: 'Keep track of execution errors',
		description: 'Setup a workflow error to track what is going on here.',
	},
];

// Mock N8nPopover to always render content when open
const MockN8nPopover = {
	name: 'N8nPopover',
	props: ['open', 'width', 'maxHeight', 'align'],
	emits: ['update:open'],
	template: `
		<div>
			<div @click="$emit('update:open', !open)" data-test-id="popover-trigger">
				<slot name="trigger" />
			</div>
			<div v-if="open" data-test-id="popover-content">
				<slot name="content" />
			</div>
		</div>
	`,
};

const stubs = {
	N8nText: { template: '<span><slot /></span>' },
	N8nLink: {
		props: ['to', 'href'],
		template: '<a :href="to || href"><slot /></a>',
	},
	N8nIcon: true,
	N8nHeading: { template: '<h4><slot /></h4>' },
	N8nTag: {
		props: ['text'],
		template: '<span>{{ text }}</span>',
	},
	N8nCallout: {
		props: ['theme'],
		template: '<div data-test-id="n8n-callout" :class="theme"><slot /></div>',
	},
	N8nPopover: MockN8nPopover,
};

describe('N8nSuggestedActions', () => {
	it('renders the suggested actions count', () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
				open: false,
				title: 'Test Title',
			},
			global: { stubs },
		});

		expect(wrapper.baseElement).toContainHTML('data-test-id="suggested-action-count"');
		expect(wrapper.getByTestId('suggested-action-count')).toHaveTextContent('0 / 2');
	});

	it('still renders the suggested actions count if all are completed', () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: [
					{ ...mockActions[0], completed: true },
					{ ...mockActions[1], completed: true },
				],
				open: false,
				title: 'Test Title',
			},
			global: { stubs },
		});

		expect(wrapper.getByTestId('suggested-action-count')).toHaveTextContent('2 / 2');
	});

	it('renders the suggested actions count with completed actions', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: [{ ...mockActions[0], completed: true }, mockActions[1]],
				open: true,
				title: 'Test Title',
			},
			global: { stubs },
		});

		expect(wrapper.getByTestId('suggested-action-count')).toBeInTheDocument();
		expect(wrapper.getByTestId('suggested-action-count')).toHaveTextContent('1 / 2');

		// Check if action items are visible and checked off
		const actionItems = wrapper.getAllByTestId('suggested-action-item');
		expect(actionItems).toHaveLength(2);
	});

	it('shows popover content when open is true', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
				open: true,
				title: 'Test Title',
			},
			global: { stubs },
		});

		// Check if action items are visible
		const actionItems = wrapper.getAllByTestId('suggested-action-item');
		expect(actionItems).toHaveLength(2);
	});

	it('renders all action items correctly when open', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
				open: true,
				title: 'Test Title',
			},
			global: { stubs },
		});

		// Check first action
		expect(wrapper.getByText('Evaluate your workflow')).toBeInTheDocument();
		expect(
			wrapper.getByText('Set up an AI evaluation to be sure th WF is reliable.'),
		).toBeInTheDocument();

		// Check second action
		expect(wrapper.getByText('Keep track of execution errors')).toBeInTheDocument();
		expect(
			wrapper.getByText('Setup a workflow error to track what is going on here.'),
		).toBeInTheDocument();
	});

	it('emits action-click event when action button is clicked', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
				open: true,
				title: 'Test Title',
			},
			global: { stubs },
		});

		const actionButtons = wrapper.getAllByTestId('suggested-action-item');
		await fireEvent.click(actionButtons[0]);

		expect(wrapper.emitted('action-click')).toBeTruthy();
		expect(wrapper.emitted('action-click')[0]).toEqual(['action1']);
	});

	it('emits update:open false when the close button is clicked', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
				open: true,
				title: 'Test Title',
			},
			global: { stubs },
		});

		await fireEvent.click(wrapper.getByTestId('suggested-actions-close'));

		expect(wrapper.emitted('update:open')).toBeTruthy();
		expect(wrapper.emitted('update:open')[0]).toEqual([false]);
	});

	it('emits update:open event when popover state changes', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
				open: false,
				title: 'Test Title',
			},
			global: { stubs },
		});

		const countTag = wrapper.getByTestId('suggested-action-count');
		await fireEvent.click(countTag);

		// Check that update:open event was emitted
		expect(wrapper.emitted('update:open')).toBeTruthy();
		expect(wrapper.emitted('update:open')[0]).toEqual([true]);
	});

	it('renders more info link when moreInfoLink is provided', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
				open: true,
				title: 'Test Title',
			},
			global: { stubs },
		});

		const moreInfoLinks = wrapper.getAllByText('More info');
		expect(moreInfoLinks).toHaveLength(1); // Only first action has moreInfoLink

		const link = moreInfoLinks[0].closest('a') as HTMLAnchorElement;
		expect(link.getAttribute('href')).toBe('https://docs.n8n.io/evaluations');
	});

	it('respects popoverAlignment prop', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
				open: false,
				title: 'Test Title',
				popoverAlignment: 'start',
			},
			global: { stubs },
		});

		// Check that the component renders correctly with the alignment prop
		expect(wrapper.getByTestId('suggested-action-count')).toBeInTheDocument();
	});

	describe('Notice functionality', () => {
		it('renders notice alert when notice prop is provided', async () => {
			const noticeText = 'This is a notice message';
			const wrapper = render(N8nSuggestedActions, {
				props: {
					actions: mockActions,
					open: true,
					title: 'Test Title',
					notice: noticeText,
				},
				global: { stubs },
			});

			// Check that the notice callout is rendered
			const callout = wrapper.getByTestId('n8n-callout');
			expect(callout).toBeInTheDocument();
			expect(callout).toHaveClass('warning');
			expect(callout).toHaveTextContent(noticeText);
		});

		it('does not render notice callout when notice prop is not provided', async () => {
			const wrapper = render(N8nSuggestedActions, {
				props: {
					actions: mockActions,
					open: true,
					title: 'Test Title',
				},
				global: { stubs },
			});

			// Check that the notice callout is not rendered
			expect(wrapper.queryByTestId('n8n-callout')).not.toBeInTheDocument();
		});

		it('does not render notice callout when notice prop is empty string', async () => {
			const wrapper = render(N8nSuggestedActions, {
				props: {
					actions: mockActions,
					open: true,
					title: 'Test Title',
					notice: '',
				},
				global: { stubs },
			});

			// Check that the notice callout is not rendered
			expect(wrapper.queryByTestId('n8n-callout')).not.toBeInTheDocument();
		});
	});
});
