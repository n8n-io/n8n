import { createTestingPinia } from '@pinia/testing';
import { describe, expect, it } from 'vitest';

import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

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

	describe('tool calls', () => {
		const toolCalls: ToolCall[] = [
			{ tool: 'lookup_order', toolCallId: 'call-1', state: 'done', input: {}, output: {} },
		];

		it('renders tool calls between the input and the answer', () => {
			// The tool-step renderer reads stores (sub-agent names), so it needs a pinia.
			const { container, getByText } = renderComponent({
				pinia: createTestingPinia(),
				props: { previewInput: 'Where is my order?', previewOutput: 'Ships tomorrow.', toolCalls },
			});

			const tools = container.querySelector('[data-testid="agent-eval-tool-calls"]');
			const answer = container.querySelector(
				'[data-test-id="instance-ai-test-agent-preview-output"]',
			);
			expect(tools).toBeInTheDocument();
			expect(answer).toBeInTheDocument();
			// The input bubble precedes the tools, which precede the answer card.
			expect(getByText('Where is my order?').compareDocumentPosition(tools!)).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING,
			);
			expect(tools!.compareDocumentPosition(answer!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		});

		it.each([
			['undefined', undefined],
			['empty', []],
		])('renders no tool section when toolCalls is %s', (_label, value) => {
			const { container } = renderComponent({
				props: { previewOutput: 'Ships tomorrow.', toolCalls: value },
			});

			expect(container.querySelector('[data-testid="agent-eval-tool-calls"]')).toBeNull();
		});
	});

	describe('rule callout visibility', () => {
		it('hides the callout for hideBanner, even with an output and a status', () => {
			const { queryByText } = renderComponent({
				props: { previewOutput: 'Ships tomorrow.', status: 'pass', hideBanner: true },
			});

			expect(queryByText('Follows the rule.')).not.toBeInTheDocument();
		});

		it('hides the callout while the case is waiting, even with an output', () => {
			const { queryByText } = renderComponent({
				props: { previewOutput: 'Ships tomorrow.', status: 'waiting' },
			});

			expect(queryByText('Follows the rule.')).not.toBeInTheDocument();
			expect(queryByText("Couldn't verify the rule.")).not.toBeInTheDocument();
		});
	});
});
