import { describe, it, expect } from 'vitest';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import AgentToolCallBlockedNote from '../components/AgentToolCallBlockedNote.vue';
import AgentToolCallRouteLabel from '../components/AgentToolCallRouteLabel.vue';
import AgentToolCallRouteList from '../components/AgentToolCallRouteList.vue';
import type {
	AgentToolCallRouteItem,
	ToolCallReason,
	ToolCallRoute,
	ToolCallSimulation,
} from '../toolCallSimulation.types';

const renderLabel = createComponentRenderer(AgentToolCallRouteLabel);
const renderNote = createComponentRenderer(AgentToolCallBlockedNote);
const renderList = createComponentRenderer(AgentToolCallRouteList);

const ROUTE_LABELS: Record<ToolCallRoute, string> = {
	real_read: 'Real read',
	simulated: 'Simulated',
	simulated_made_up: 'Simulated (made up)',
	blocked: 'Blocked',
};

const REASON_TEXT: Record<ToolCallReason, string> = {
	served_from_world: 'The simulation answered from its test data and earlier calls in this test.',
	invented_by_llm: "The simulation made up this reply. It isn't based on any real data.",
	real_read_allowed: 'Read from the real service. Reads are allowed in tests.',
	unsupported_by_simulator:
		"The simulator can't handle this call yet. This is a gap in the simulator, not an error in your agent.",
	simulator_unavailable: "The simulator didn't respond, so this call didn't run.",
	not_simulatable: "This kind of tool can't be simulated yet, so this call didn't run.",
	blocked_by_policy: 'A test rule stopped this call. Nothing was sent.',
};

/** Every route with each reason the backend pairs it with. */
const ROUTE_REASON_PAIRS: Array<[ToolCallRoute, ToolCallReason]> = [
	['real_read', 'real_read_allowed'],
	['simulated', 'served_from_world'],
	['simulated_made_up', 'invented_by_llm'],
	['blocked', 'unsupported_by_simulator'],
	['blocked', 'simulator_unavailable'],
	['blocked', 'not_simulatable'],
	['blocked', 'blocked_by_policy'],
];

const BLOCKED_NEXT_STEPS: Partial<Record<ToolCallReason, string>> = {
	unsupported_by_simulator:
		'Keep testing the rest of your agent. This call runs for real once the agent is published.',
	simulator_unavailable: 'Send your message again in a moment.',
	not_simulatable:
		"Check this tool's setup before you publish. It runs for real once the agent is published.",
	blocked_by_policy: 'Ask an admin if this tool should run in tests.',
};

async function hoverAndGetTooltip(trigger: HTMLElement) {
	const user = userEvent.setup();
	await user.hover(trigger);
	return await waitFor(() => {
		const tooltip = document.querySelector<HTMLElement>(
			'[data-test-id="agent-tool-call-route-reason"]',
		);
		if (!tooltip) throw new Error('tooltip not open');
		return tooltip;
	});
}

describe('AgentToolCallRouteLabel', () => {
	it.each(ROUTE_REASON_PAIRS)('labels a %s call (%s)', (route, reason) => {
		const { getByTestId } = renderLabel({ props: { simulation: { route, reason } } });

		const label = getByTestId('agent-tool-call-route-label');
		expect(label).toHaveAttribute('data-route', route);
		expect(label).toHaveAttribute('data-reason', reason);
		expect(within(label).getByText(ROUTE_LABELS[route])).toBeInTheDocument();
	});

	it.each(ROUTE_REASON_PAIRS)(
		'shows the reason for a %s call (%s) on hover',
		async (route, reason) => {
			const { getByTestId } = renderLabel({ props: { simulation: { route, reason } } });

			const tooltip = await hoverAndGetTooltip(getByTestId('agent-tool-call-route-label'));

			expect(tooltip).toHaveTextContent(REASON_TEXT[reason]);
		},
	);

	it.each(ROUTE_REASON_PAIRS)(
		'gives screen readers the reason for a %s call (%s) without hover',
		(route, reason) => {
			const { getByTestId } = renderLabel({ props: { simulation: { route, reason } } });

			expect(getByTestId('agent-tool-call-route-label')).toHaveTextContent(REASON_TEXT[reason]);
		},
	);

	it('makes clear that a made-up reply is not based on real data', async () => {
		const { getByTestId } = renderLabel({
			props: { simulation: { route: 'simulated_made_up', reason: 'invented_by_llm' } },
		});

		const label = getByTestId('agent-tool-call-route-label');
		expect(label).toHaveTextContent('Simulated (made up)');

		const tooltip = await hoverAndGetTooltip(label);
		expect(tooltip).toHaveTextContent("It isn't based on any real data.");
	});

	it('says a simulator gap is not an agent error', async () => {
		const { getByTestId } = renderLabel({
			props: { simulation: { route: 'blocked', reason: 'unsupported_by_simulator' } },
		});

		const tooltip = await hoverAndGetTooltip(getByTestId('agent-tool-call-route-label'));

		expect(tooltip).toHaveTextContent(
			'This is a gap in the simulator, not an error in your agent.',
		);
	});

	it('adds the detail under the reason in the tooltip', async () => {
		const { getByTestId } = renderLabel({
			props: {
				simulation: {
					route: 'blocked',
					reason: 'not_simulatable',
					detail: 'Code nodes cannot run in a test run.',
				},
			},
		});

		const tooltip = await hoverAndGetTooltip(getByTestId('agent-tool-call-route-label'));

		expect(tooltip).toHaveTextContent(REASON_TEXT.not_simulatable);
		expect(within(tooltip).getByTestId('agent-tool-call-route-detail')).toHaveTextContent(
			'Code nodes cannot run in a test run.',
		);
	});

	it('opens the reason tooltip from the keyboard', async () => {
		const user = userEvent.setup();
		const { getByTestId } = renderLabel({
			props: { simulation: { route: 'simulated', reason: 'served_from_world' } },
		});

		await user.tab();
		expect(getByTestId('agent-tool-call-route-label')).toHaveFocus();
		await waitFor(() =>
			expect(
				document.querySelector('[data-test-id="agent-tool-call-route-reason"]'),
			).toHaveTextContent(REASON_TEXT.served_from_world),
		);
	});

	it('renders nothing for a route this client does not know', () => {
		const { queryByTestId } = renderLabel({
			props: {
				simulation: {
					route: 'future_route',
					reason: 'served_from_world',
				} as unknown as ToolCallSimulation,
			},
		});

		expect(queryByTestId('agent-tool-call-route-label')).not.toBeInTheDocument();
	});

	it('keeps the label for a reason this client does not know', () => {
		const { getByTestId } = renderLabel({
			props: {
				simulation: {
					route: 'simulated',
					reason: 'future_reason',
				} as unknown as ToolCallSimulation,
			},
		});

		expect(getByTestId('agent-tool-call-route-label')).toHaveTextContent('Simulated');
	});
});

describe('AgentToolCallBlockedNote', () => {
	it.each(['reason_from_a_newer_server', 'constructor', 'toString'])(
		'falls back to the generic next step for an unknown reason (%s)',
		(reason) => {
			const { getByTestId } = renderNote({
				props: {
					simulation: { route: 'blocked', reason } as unknown as ToolCallSimulation,
				},
			});

			expect(getByTestId('agent-tool-call-blocked-note')).toHaveTextContent(
				'Nothing was sent. Keep testing the rest of your agent.',
			);
		},
	);

	it.each(['real_read', 'simulated', 'simulated_made_up'] as const)(
		'renders nothing for a %s call',
		(route) => {
			const { queryByTestId } = renderNote({
				props: { simulation: { route, reason: 'served_from_world' } },
			});

			expect(queryByTestId('agent-tool-call-blocked-note')).not.toBeInTheDocument();
		},
	);

	it.each(Object.entries(BLOCKED_NEXT_STEPS) as Array<[ToolCallReason, string]>)(
		'says why a call blocked for %s did not run and what to do next',
		(reason, nextStep) => {
			const { getByTestId } = renderNote({
				props: { simulation: { route: 'blocked', reason } },
			});

			expect(getByTestId('agent-tool-call-blocked-note')).toHaveAttribute('role', 'note');
			expect(getByTestId('agent-tool-call-blocked-reason')).toHaveTextContent(REASON_TEXT[reason]);
			expect(getByTestId('agent-tool-call-blocked-next-step')).toHaveTextContent(nextStep);
		},
	);

	it('presents a simulator gap as the simulator’s, not the agent’s', () => {
		const { getByTestId } = renderNote({
			props: { simulation: { route: 'blocked', reason: 'unsupported_by_simulator' } },
		});

		const note = getByTestId('agent-tool-call-blocked-note');
		expect(note).toHaveTextContent('not an error in your agent');
		expect(note.querySelector('[data-icon="info"]')).not.toBeNull();
		expect(note.querySelector('[data-icon="ban"]')).toBeNull();
	});

	it('shows the detail from the backend', () => {
		const { getByTestId } = renderNote({
			props: {
				simulation: {
					route: 'blocked',
					reason: 'blocked_by_policy',
					detail: 'Real reads are not available in test runs yet.',
				},
			},
		});

		expect(getByTestId('agent-tool-call-blocked-detail')).toHaveTextContent(
			'Real reads are not available in test runs yet.',
		);
	});

	it('omits the detail when it is blank', () => {
		const { queryByTestId } = renderNote({
			props: { simulation: { route: 'blocked', reason: 'not_simulatable', detail: '   ' } },
		});

		expect(queryByTestId('agent-tool-call-blocked-detail')).not.toBeInTheDocument();
	});

	it('falls back to a generic next step for an unexpected reason', () => {
		const { getByTestId } = renderNote({
			props: { simulation: { route: 'blocked', reason: 'served_from_world' } },
		});

		expect(getByTestId('agent-tool-call-blocked-next-step')).toHaveTextContent(
			'Nothing was sent. Keep testing the rest of your agent.',
		);
	});
});

describe('AgentToolCallRouteList', () => {
	const LONG_TOOL_NAME =
		'google_sheets_append_row_to_the_quarterly_customer_feedback_spreadsheet_for_the_emea_region_v2';

	const calls: AgentToolCallRouteItem[] = [
		{
			toolCallId: 'call-1',
			toolName: 'Search the knowledge base',
			simulation: { route: 'real_read', reason: 'real_read_allowed' },
		},
		{
			toolCallId: 'call-2',
			toolName: LONG_TOOL_NAME,
			simulation: { route: 'simulated', reason: 'served_from_world' },
		},
		{
			toolCallId: 'call-3',
			toolName: 'Create Zendesk ticket',
			simulation: { route: 'simulated_made_up', reason: 'invented_by_llm' },
		},
		{
			toolCallId: 'call-4',
			toolName: 'Send Slack message',
			simulation: {
				route: 'blocked',
				reason: 'unsupported_by_simulator',
				detail: 'The simulator does not support this call yet.',
			},
		},
		{
			toolCallId: 'call-5',
			toolName: 'Run custom code',
			simulation: { route: 'blocked', reason: 'not_simulatable' },
		},
		{ toolCallId: 'call-6', toolName: 'Still running' },
	];

	it('shows each call of a turn in order with its own label', () => {
		const { getAllByTestId } = renderList({ props: { calls } });

		const items = getAllByTestId('agent-tool-call-route-item');
		expect(items.map((item) => item.getAttribute('data-tool-call-id'))).toEqual([
			'call-1',
			'call-2',
			'call-3',
			'call-4',
			'call-5',
			'call-6',
		]);
		expect(
			items
				.slice(0, 5)
				.map((item) =>
					within(item).getByTestId('agent-tool-call-route-label').getAttribute('data-route'),
				),
		).toEqual(['real_read', 'simulated', 'simulated_made_up', 'blocked', 'blocked']);
	});

	it('adds a blocked note only under blocked calls', () => {
		const { getAllByTestId } = renderList({ props: { calls } });

		const items = getAllByTestId('agent-tool-call-route-item');
		const notes = items.map(
			(item) =>
				within(item).queryByTestId('agent-tool-call-blocked-note')?.getAttribute('data-reason') ??
				null,
		);
		expect(notes).toEqual([null, null, null, 'unsupported_by_simulator', 'not_simulatable', null]);
	});

	it('shows no label for a call without a simulation result', () => {
		const { getAllByTestId } = renderList({ props: { calls } });

		const lastItem = getAllByTestId('agent-tool-call-route-item')[5];
		expect(within(lastItem).getByText('Still running')).toBeInTheDocument();
		expect(within(lastItem).queryByTestId('agent-tool-call-route-label')).not.toBeInTheDocument();
	});

	it('keeps the full name of a long tool on hover and keeps its label', () => {
		const { getAllByTestId } = renderList({ props: { calls } });

		const item = getAllByTestId('agent-tool-call-route-item')[1];
		const name = within(item).getByTestId('agent-tool-call-route-tool-name');
		expect(name).toHaveTextContent(LONG_TOOL_NAME);
		expect(name).toHaveAttribute('title', LONG_TOOL_NAME);
		expect(within(item).getByTestId('agent-tool-call-route-label')).toHaveTextContent('Simulated');
	});

	it('renders an empty list for a turn without tool calls', () => {
		const { getByTestId, queryAllByTestId } = renderList({ props: { calls: [] } });

		expect(getByTestId('agent-tool-call-route-list')).toBeInTheDocument();
		expect(queryAllByTestId('agent-tool-call-route-item')).toHaveLength(0);
	});
});
