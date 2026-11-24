import { createTestingPinia } from '@pinia/testing';
import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import AgentAssistantTestRunCard from '@/features/agents/components/AgentAssistantTestRunCard.vue';
import type { AgentAssistantTestRunCall as Call } from '@/features/agents/assistantTestRun.types';

const render = createComponentRenderer(AgentAssistantTestRunCard);
const email: Call = {
	toolCallId: 'email',
	toolName: 'send_email',
	simulation: { route: 'simulated_made_up', reason: 'invented_by_llm' },
	preview: {
		kind: 'email',
		toolName: 'send_email',
		subject: 'Refund update',
		body: '<script>example</script>',
	},
};
const blocked: Call = {
	toolCallId: 'blocked',
	toolName: 'run_code',
	simulation: { route: 'blocked', reason: 'not_simulatable' },
};
function setup(calls: Call[] = [email], testChatId?: string) {
	return render({
		props: { agentName: 'Support agent', calls, testChatId },
		pinia: createTestingPinia(),
	});
}

describe('AgentAssistantTestRunCard', () => {
	it('starts collapsed with an explicit test badge and an accessible toggle', () => {
		const { getByText, getByRole, container } = setup();
		expect(getByRole('region', { name: 'Support agent Test run' })).toBeVisible();
		expect(getByText('Support agent')).toBeVisible();
		expect(getByText('Test run', { exact: true })).toBeVisible();
		const toggle = getByRole('button', { name: 'Test run details' });
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(
			container.querySelector(`[id="${toggle.getAttribute('aria-controls')}"]`),
		).not.toBeVisible();
		expect(getByText('Refund update')).not.toBeVisible();
	});

	it.each([
		['simulated', [{ ...email, simulation: { route: 'simulated', reason: 'served_from_world' } }]],
		['made up', [email]],
		['blocked', [blocked]],
		['mixed', [email, blocked]],
	] satisfies Array<[string, Call[]]>)('expands and collapses %s calls', async (_name, calls) => {
		const { getByRole, getAllByRole, getAllByTestId } = setup(calls);
		const toggle = getByRole('button', { name: 'Test run details' });
		await userEvent.click(toggle);
		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(getAllByTestId('agent-tool-call-route-row')).toHaveLength(calls.length);
		expect(getAllByRole('list')).toHaveLength(1);
		expect(getAllByRole('listitem')).toHaveLength(calls.length);
		for (const name of getAllByTestId('agent-tool-call-route-tool-name'))
			expect(name).toBeVisible();
		await userEvent.click(toggle);
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		for (const name of getAllByTestId('agent-tool-call-route-tool-name'))
			expect(name).not.toBeVisible();
	});

	it('keeps previews beside their simulated calls and renders content as plain text', async () => {
		const { getByRole, container } = setup([email, blocked]);
		await userEvent.click(getByRole('button', { name: 'Test run details' }));
		const emailRow = within(container.querySelector<HTMLElement>('[data-tool-call-id="email"]')!);
		const blockedRow = within(
			container.querySelector<HTMLElement>('[data-tool-call-id="blocked"]')!,
		);
		expect(emailRow.getByText('Refund update')).toBeVisible();
		expect(emailRow.getByText('Not sent in this test run')).toBeVisible();
		expect(emailRow.getByText('<script>example</script>')).toBeVisible();
		expect(blockedRow.queryByText('Refund update')).not.toBeInTheDocument();
		expect(blockedRow.queryByText('Not sent in this test run')).not.toBeInTheDocument();
		expect(container.querySelector('script')).toBeNull();
	});

	it.each(['simulated', 'simulated_made_up'] as const)(
		'shows the preview for a %s call',
		async (route) => {
			const reason = route === 'simulated' ? 'served_from_world' : 'invented_by_llm';
			const { getByRole, getByText } = setup([{ ...email, simulation: { route, reason } }]);
			await userEvent.click(getByRole('button', { name: 'Test run details' }));
			expect(getByText('Refund update')).toBeVisible();
			expect(getByText('Not sent in this test run')).toBeVisible();
		},
	);

	it('does not show action previews for blocked, unclassified or mismatched calls', async () => {
		const { getByRole, queryByText } = setup([
			{ ...blocked, preview: email.preview },
			{ toolCallId: 'pending', toolName: 'pending_call', preview: email.preview },
			{ ...email, toolCallId: 'other', toolName: 'post_message' },
		]);
		await userEvent.click(getByRole('button', { name: 'Test run details' }));
		expect(queryByText('Refund update')).not.toBeInTheDocument();
		expect(queryByText('Not sent in this test run')).not.toBeInTheDocument();
	});

	it('renders a simulated call whose preview is null', async () => {
		const { getByRole, getAllByTestId, queryByText } = setup([{ ...email, preview: null }]);
		await userEvent.click(getByRole('button', { name: 'Test run details' }));
		expect(getAllByTestId('agent-tool-call-route-row')).toHaveLength(1);
		expect(queryByText('Not sent in this test run')).not.toBeInTheDocument();
	});

	it('marks the open action for analytics', () => {
		const { getByTestId } = setup([email], 'chat-1');
		expect(getByTestId('agent-assistant-test-run-open-chat')).toHaveAttribute(
			'data-attr',
			'agent-assistant-test-run-open-chat',
		);
	});

	it('opens only the supplied chat when the user selects the action', async () => {
		const { getByRole, emitted } = setup([email], 'chat-1');
		expect(emitted('openTestChat')).toBeUndefined();
		await userEvent.click(getByRole('button', { name: 'Open test chat' }));
		expect(emitted('openTestChat')).toEqual([['chat-1']]);
	});

	it('emits the same trimmed chat id that decides whether the action shows', async () => {
		const { getByRole, emitted } = setup([email], '  chat-1 ');
		await userEvent.click(getByRole('button', { name: 'Open test chat' }));
		expect(emitted('openTestChat')).toEqual([['chat-1']]);
	});

	it.each([undefined, '', '   '])('hides the open action without a saved chat: %s', (id) => {
		const { queryByRole } = setup([], id);
		expect(queryByRole('button', { name: 'Open test chat' })).not.toBeInTheDocument();
	});

	it('shows an honest empty state without claiming a completed run', async () => {
		const { getByRole, getByText, queryByText } = setup([]);
		await userEvent.click(getByRole('button', { name: 'Test run details' }));
		expect(getByText('No tool calls to show yet.')).toBeVisible();
		expect(queryByText(/nothing was sent/i)).not.toBeInTheDocument();
	});

	it('supports keyboard expansion and gives each card a separate details id', async () => {
		const Host = defineComponent({
			components: { AgentAssistantTestRunCard },
			template:
				'<AgentAssistantTestRunCard agent-name="First" :calls="[]" /><AgentAssistantTestRunCard agent-name="Second" :calls="[]" />',
		});
		const { getAllByRole } = createComponentRenderer(Host)({ pinia: createTestingPinia() });
		const toggles = getAllByRole('button', { name: 'Test run details' });
		expect(toggles[0].getAttribute('aria-controls')).not.toBe(
			toggles[1].getAttribute('aria-controls'),
		);
		toggles[0].focus();
		await userEvent.keyboard('{Enter}');
		expect(toggles[0]).toHaveAttribute('aria-expanded', 'true');
		expect(toggles[1]).toHaveAttribute('aria-expanded', 'false');
	});
});
