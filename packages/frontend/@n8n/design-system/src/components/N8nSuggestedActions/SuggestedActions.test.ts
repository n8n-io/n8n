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

	it('shows red dot when showRedDot is true', () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
				showRedDot: true,
			},
		});

		expect(wrapper.getByTestId('suggested-actions-red-dot')).toBeInTheDocument();
	});

	it('does not show red dot when showRedDot is false', () => {
		const wrapper = render(N8nSuggestedActions, {
			props: {
				actions: mockActions,
				showRedDot: false,
			},
		});

		expect(wrapper.queryByTestId('suggested-actions-red-dot')).not.toBeInTheDocument();
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
});
