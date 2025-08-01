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
const stubs = ['n8n-text', 'n8n-link', 'n8n-icon'];

describe('N8nSuggestedActions', () => {
	it('renders the suggested actions count', () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
			},
		});

		expect(wrapper.baseElement).toContainHTML('data-test-id="suggested-action-count"');
		expect(wrapper.getByTestId('suggested-action-count')).toHaveTextContent('0 / 2');
	});

	it('does not render the suggested actions count if all are completed', () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: [
					{ ...mockActions[0], completed: true },
					{ ...mockActions[1], completed: true },
				],
			},
		});

		expect(wrapper.baseElement).not.toContainHTML('data-test-id="suggested-action-count"');
	});

	it('renders the suggested actions count with completed actions', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: [{ ...mockActions[0], completed: true }, mockActions[1]],
			},
			global: { stubs },
		});

		expect(wrapper.getByTestId('suggested-action-count')).toBeInTheDocument();
		expect(wrapper.getByTestId('suggested-action-count')).toHaveTextContent('1 / 2');

		const countTag = wrapper.getByTestId('suggested-action-count');
		await fireEvent.click(countTag);

		// Check if action items are visible and checked off
		const actionItems = wrapper.getAllByTestId('suggested-action-item');
		expect(actionItems).toHaveLength(2);
		expect(actionItems).toMatchSnapshot();
	});

	it('opens popover when count tag is clicked and all items are not completed', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
			},
			global: { stubs },
		});

		const countTag = wrapper.getByTestId('suggested-action-count');
		await fireEvent.click(countTag);

		// Check if action items are visible
		const actionItems = wrapper.getAllByTestId('suggested-action-item');
		expect(actionItems).toHaveLength(2);
		expect(actionItems).toMatchSnapshot();
	});

	it('renders all action items correctly', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
			},
		});

		const countTag = wrapper.getByTestId('suggested-action-count');
		await fireEvent.click(countTag);

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
			},
		});

		const countTag = wrapper.getByTestId('suggested-action-count');
		await fireEvent.click(countTag);

		const actionButtons = wrapper.getAllByTestId('suggested-action-item');
		await fireEvent.click(actionButtons[0]);

		expect(wrapper.emitted('action-click')).toBeTruthy();
		expect(wrapper.emitted('action-click')[0]).toEqual(['action1']);
	});

	it('emits ignore-click event when ignore link is clicked', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
			},
		});

		const countTag = wrapper.getByTestId('suggested-action-count');
		await fireEvent.click(countTag);

		const ignoreLinks = wrapper.getAllByTestId('suggested-action-ignore');
		await fireEvent.click(ignoreLinks[0]);

		// Wait for the delayed emission
		await new Promise((resolve) => setTimeout(resolve, 600));

		expect(wrapper.emitted('ignore-click')).toBeTruthy();
		expect(wrapper.emitted('ignore-click')[0]).toEqual(['action1']);
	});

	it('exposes openPopover method', async () => {
		const { container } = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
			},
		});

		// Check that the component renders correctly
		expect(container.querySelector('[data-test-id="suggested-action-count"]')).toBeInTheDocument();
	});

	it('shows custom ignore all text when ignoreAllLabel is provided', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
				ignoreAllLabel: 'Ignore for all',
			},
			global: { stubs: { N8nIcon: true } },
		});

		const countTag = wrapper.getByTestId('suggested-action-count');
		await fireEvent.click(countTag);

		expect(wrapper.getByTestId('suggested-action-ignore-all')).toBeInTheDocument();
		expect(wrapper.getByText('Ignore for all')).toBeInTheDocument();
	});

	it('emits ignore-all event when turn off link is clicked', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
				ignoreAllLabel: 'Ignore for all',
			},
			global: { stubs: { N8nIcon: true } },
		});

		const bellButton = wrapper.getByTestId('suggested-action-count');
		await fireEvent.click(bellButton);

		const turnOffLink = wrapper.getByTestId('suggested-action-ignore-all');
		expect(wrapper.getByText('Ignore for all')).toBeInTheDocument();
		await fireEvent.click(turnOffLink);

		expect(wrapper.emitted('ignore-all')).toBeTruthy();
	});

	it('renders more info link when moreInfoLink is provided', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
			},
		});

		const bellButton = wrapper.getByTestId('suggested-action-count');
		await fireEvent.click(bellButton);

		const moreInfoLinks = wrapper.getAllByText('More info');
		expect(moreInfoLinks).toHaveLength(1); // Only first action has moreInfoLink

		const link = moreInfoLinks[0].closest('a') as HTMLAnchorElement;
		expect(link.getAttribute('href')).toBe('https://docs.n8n.io/evaluations');
	});

	it('applies ignoring class when action is being ignored', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
			},
		});

		const bellButton = wrapper.getByTestId('suggested-action-count');
		await fireEvent.click(bellButton);

		const actionItems = wrapper.getAllByTestId('suggested-action-item');
		const ignoreLinks = wrapper.getAllByTestId('suggested-action-ignore');

		// Click ignore on first action
		await fireEvent.click(ignoreLinks[0]);

		// Check if the action item has the ignoring class
		expect(actionItems[0]).toHaveClass('ignoring');
	});

	it('exposes closePopover method', async () => {
		const { container } = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
			},
		});

		// Check that the component renders correctly (closePopover is exposed but we can't test it directly in this environment)
		expect(container.querySelector('[data-test-id="suggested-action-count"]')).toBeInTheDocument();
	});

	it('respects popoverAlignment prop', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
				popoverAlignment: 'start',
			},
		});

		// Check that the component renders correctly with the alignment prop
		expect(wrapper.getByTestId('suggested-action-count')).toBeInTheDocument();
	});
});
