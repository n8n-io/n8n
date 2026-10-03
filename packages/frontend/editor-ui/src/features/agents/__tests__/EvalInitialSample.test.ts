import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import EvalInitialSample from '../components/EvalInitialSample.vue';

const renderComponent = createComponentRenderer(EvalInitialSample, {
	props: { previewInput: 'Where is my order?', previewOutput: '' },
});

describe('EvalInitialSample', () => {
	it('shows no callout when there is no output yet', () => {
		const { queryByText } = renderComponent();

		expect(queryByText("Couldn't verify the rule.")).not.toBeInTheDocument();
		expect(queryByText('Follows the rule.')).not.toBeInTheDocument();
	});

	it('shows a success callout for a passing status, with no detail text', () => {
		const { getByText, queryByText } = renderComponent({
			props: { previewOutput: 'Order #123 ships tomorrow.', status: 'pass' },
		});

		expect(getByText('Follows the rule.')).toBeInTheDocument();
		expect(queryByText("Couldn't verify the rule.")).not.toBeInTheDocument();
	});

	it('shows a warning callout with the error reason for a failing status', () => {
		const { getByText } = renderComponent({
			props: {
				previewOutput: 'Your settings are wrong.',
				status: 'fail',
				errorMessage: "Blamed the customer's settings instead of apologising.",
			},
		});

		expect(getByText("Couldn't verify the rule.")).toBeInTheDocument();
		expect(getByText("Blamed the customer's settings instead of apologising.")).toBeInTheDocument();
	});

	it('shows the warning callout for a "needs work" status too, not only an outright failure', () => {
		const { getByText } = renderComponent({
			props: { previewOutput: 'Partial answer.', status: 'work' },
		});

		expect(getByText("Couldn't verify the rule.")).toBeInTheDocument();
	});

	// The regression this guards: the callout used to key off whether
	// `errorMessage` was set, so an "Actually fine" override (which changes
	// `status` to `pass` but leaves the old `errorMessage` untouched) kept
	// showing the stale warning instead of following the corrected status.
	it('follows status over a stale errorMessage once a row is marked "actually fine"', () => {
		const { getByText, queryByText } = renderComponent({
			props: {
				previewOutput: 'Your settings are wrong.',
				status: 'pass',
				errorMessage: 'This note should no longer matter.',
			},
		});

		expect(getByText('Follows the rule.')).toBeInTheDocument();
		expect(queryByText("Couldn't verify the rule.")).not.toBeInTheDocument();
	});
});
