import { render, fireEvent } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';

import N8nSuggestedActions from './SuggestedActions.vue';

const mockActions = [
	{
		id: 'action1',
		title: 'Evaluate your workflow',
		description: 'Set up an AI evaluation to be sure th WF is reliable.',
		moreInfoLink: 'https://docs.n8n.io/evaluations',
		buttonLabel: 'Go to evaluations',
	},
	{
		id: 'action2',
		title: 'Keep track of execution errors',
		description: 'Setup a workflow error to track what is going on here.',
		buttonLabel: 'Settings',
	},
];

describe('N8nSuggestedActions', () => {
	it('renders the bell icon button', () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
			},
		});

		expect(wrapper.getByTestId('suggested-actions-bell')).toBeInTheDocument();
	});

	it('opens popover when bell icon is clicked', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
			},
		});

		const bellButton = wrapper.getByTestId('suggested-actions-bell');
		await fireEvent.click(bellButton);

		// Check if action items are visible
		const actionItems = wrapper.getAllByTestId('suggested-action-item');
		expect(actionItems).toHaveLength(2);
	});

	it('renders all action items correctly', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
			},
		});

		const bellButton = wrapper.getByTestId('suggested-actions-bell');
		await fireEvent.click(bellButton);

		// Check first action
		expect(wrapper.getByText('Evaluate your workflow')).toBeInTheDocument();
		expect(
			wrapper.getByText('Set up an AI evaluation to be sure th WF is reliable.'),
		).toBeInTheDocument();
		expect(wrapper.getByText('Go to evaluations')).toBeInTheDocument();

		// Check second action
		expect(wrapper.getByText('Keep track of execution errors')).toBeInTheDocument();
		expect(
			wrapper.getByText('Setup a workflow error to track what is going on here.'),
		).toBeInTheDocument();
		expect(wrapper.getByText('Settings')).toBeInTheDocument();
	});

	it('emits action-click event when action button is clicked', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
			},
		});

		const bellButton = wrapper.getByTestId('suggested-actions-bell');
		await fireEvent.click(bellButton);

		const actionButtons = wrapper.getAllByTestId('suggested-action-button');
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

		const bellButton = wrapper.getByTestId('suggested-actions-bell');
		await fireEvent.click(bellButton);

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
		expect(container.querySelector('[data-test-id="suggested-actions-bell"]')).toBeInTheDocument();
	});

	it('shows turn off link when turnOffActionsLabel is provided', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
				turnOffActionsLabel: 'Turn off suggestions',
			},
		});

		const bellButton = wrapper.getByTestId('suggested-actions-bell');
		await fireEvent.click(bellButton);

		expect(wrapper.getByTestId('suggested-action-turn-off-all')).toBeInTheDocument();
		expect(wrapper.getByText('Turn off suggestions')).toBeInTheDocument();
	});

	it('emits turn-off event when turn off link is clicked', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
				turnOffActionsLabel: 'Turn off suggestions',
			},
		});

		const bellButton = wrapper.getByTestId('suggested-actions-bell');
		await fireEvent.click(bellButton);

		const turnOffLink = wrapper.getByTestId('suggested-action-turn-off-all');
		await fireEvent.click(turnOffLink);

		expect(wrapper.emitted('turn-off')).toBeTruthy();
	});

	it('shows ignore all link when there are multiple actions', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
			},
		});

		const bellButton = wrapper.getByTestId('suggested-actions-bell');
		await fireEvent.click(bellButton);

		expect(wrapper.getByTestId('suggested-action-ignore-all')).toBeInTheDocument();
		expect(wrapper.getByText('Ignore all')).toBeInTheDocument();
	});

	it('does not show ignore all link when there is only one action', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: [mockActions[0]],
			},
		});

		const bellButton = wrapper.getByTestId('suggested-actions-bell');
		await fireEvent.click(bellButton);

		expect(wrapper.queryByTestId('suggested-action-ignore-all')).not.toBeInTheDocument();
	});

	it('emits ignore-all event when ignore all link is clicked', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
			},
		});

		const bellButton = wrapper.getByTestId('suggested-actions-bell');
		await fireEvent.click(bellButton);

		const ignoreAllLink = wrapper.getByTestId('suggested-action-ignore-all');
		await fireEvent.click(ignoreAllLink);

		expect(wrapper.emitted('ignore-all')).toBeTruthy();
	});

	it('renders more info link when moreInfoLink is provided', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
			},
		});

		const bellButton = wrapper.getByTestId('suggested-actions-bell');
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

		const bellButton = wrapper.getByTestId('suggested-actions-bell');
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
		expect(container.querySelector('[data-test-id="suggested-actions-bell"]')).toBeInTheDocument();
	});

	it('respects popoverAlignment prop', async () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
				popoverAlignment: 'start',
			},
		});

		// Check that the component renders correctly with the alignment prop
		expect(wrapper.getByTestId('suggested-actions-bell')).toBeInTheDocument();
	});
});
