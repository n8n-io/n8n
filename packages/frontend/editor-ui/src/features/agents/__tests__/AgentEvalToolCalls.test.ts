import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import AgentEvalToolCalls from '../components/AgentEvalToolCalls.vue';
import { toDisplayToolCalls } from '../utils/agent-eval-tool-calls';

const renderComponent = createComponentRenderer(AgentEvalToolCalls, {
	global: { plugins: [createTestingPinia()] },
});

const request = {
	url: 'https://slack.com/api/chat.postMessage',
	method: 'POST',
	nodeType: 'n8n-nodes-base.slack',
	requestBody: { channel: 'support', text: 'Your order is ready.' },
	mockResponse: { ok: true, ts: 'mock-message' },
};

function calls(withRequest: boolean, grouped = false) {
	return toDisplayToolCalls({
		calls: [
			{
				tool: 'send_and_wait',
				toolCallId: 'wait-1',
				status: 'running',
				input: { channel: 'support' },
				mocked: withRequest,
				interceptedRequests: withRequest ? [request] : [],
			},
			...(grouped ? [{ tool: 'lookup', toolCallId: 'lookup-1', output: 'Order found' }] : []),
		],
	});
}

it.each([false, true])(
	'shows intercepted requests before completion (grouped: %s)',
	async (grouped) => {
		const user = userEvent.setup();
		const { getByText, queryByText, rerender } = renderComponent({
			props: { toolCalls: calls(false, grouped) },
		});
		if (grouped) await user.click(getByText('2 tool calls'));
		await user.click(getByText('Send and wait'));
		expect(getByText('Input')).toBeInTheDocument();

		await rerender({ toolCalls: calls(true, grouped) });

		expect(getByText(/Mocked request sent; tool still running/)).toBeInTheDocument();
		// The disclosure stays open as live progress arrives.
		expect(getByText('Mocked requests')).toBeInTheDocument();
		expect(getByText(/https:\/\/slack.com\/api\/chat.postMessage/)).toHaveTextContent(
			'Your order is ready.',
		);
		expect(getByText(/mock-message/)).toHaveTextContent('POST');
		expect(queryByText('Output')).not.toBeInTheDocument();
	},
);

it('keeps legacy calls free of mock claims', () => {
	const { queryByText } = renderComponent({
		props: { toolCalls: toDisplayToolCalls({ calls: [{ tool: 'lookup', output: 'Found' }] }) },
	});
	expect(queryByText(/Mocked/)).not.toBeInTheDocument();
});

it('opens recorded mock details when the tool has no input or output', async () => {
	const user = userEvent.setup();
	const { getByText } = renderComponent({
		props: {
			toolCalls: toDisplayToolCalls({
				calls: [
					{
						tool: 'send_and_wait',
						status: 'running',
						mocked: true,
						interceptedRequests: [request],
					},
				],
			}),
		},
	});
	await user.click(getByText(/Send and wait/));
	expect(getByText('Mocked requests')).toBeInTheDocument();
});
