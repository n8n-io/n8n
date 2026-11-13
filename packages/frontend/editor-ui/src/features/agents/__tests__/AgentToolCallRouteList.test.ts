import { describe, it, expect } from 'vitest';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import AgentToolCallRouteIcon from '../components/AgentToolCallRouteIcon.vue';
import AgentToolCallRouteList from '../components/AgentToolCallRouteList.vue';
import AgentToolCallRouteRow from '../components/AgentToolCallRouteRow.vue';
import type {
	AgentToolCallRouteItem,
	ToolCallReason,
	ToolCallRoute,
	ToolCallSimulation,
} from '../toolCallSimulation.types';

const renderIcon = createComponentRenderer(AgentToolCallRouteIcon);
const renderRow = createComponentRenderer(AgentToolCallRouteRow);
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

const BLOCKED_NEXT_STEPS = {
	unsupported_by_simulator:
		'Keep testing the rest of your agent. This call runs for real once the agent is published.',
	simulator_unavailable: 'Send your message again in a moment.',
	not_simulatable:
		"Check this tool's setup before you publish. It runs for real once the agent is published.",
	blocked_by_policy: 'Ask an admin if this tool should run in tests.',
} satisfies Partial<Record<ToolCallReason, string>>;

const FALLBACK_NEXT_STEP = 'Nothing was sent. Keep testing the rest of your agent.';

const LONG_TOOL_NAME =
	'google_sheets_append_row_to_the_quarterly_customer_feedback_spreadsheet_for_the_emea_region_v2';

function callWith(simulation?: ToolCallSimulation, toolName = 'Send Slack message') {
	const call: AgentToolCallRouteItem = { toolCallId: 'call-1', toolName };
	if (simulation) call.simulation = simulation;
	return { call };
}

/** A wire value that may be newer than this client. */
function unknownSimulation(route: string, reason: string): ToolCallSimulation {
	return { route, reason } as unknown as ToolCallSimulation;
}

/** Opens a row with a click and returns its details. */
async function expand(container: Element) {
	const user = userEvent.setup();
	const row = within(container as HTMLElement);
	await user.click(row.getByTestId('agent-tool-call-route-toggle'));
	const details = row.getByTestId('agent-tool-call-route-details');
	await waitFor(() => expect(details).toBeVisible());
	return details;
}

describe('AgentToolCallRouteIcon', () => {
	it.each(Object.entries(ROUTE_LABELS) as Array<[ToolCallRoute, string]>)(
		'names the %s icon for screen readers',
		(route, label) => {
			const { getByRole } = renderIcon({ props: { route } });

			const icon = getByRole('img', { name: label });
			expect(icon).toHaveAttribute('data-route', route);
			// Icon only: no visible text.
			expect(icon).toHaveTextContent('');
		},
	);

	it('shows the route label in a tooltip on hover', async () => {
		const user = userEvent.setup();
		const { getByTestId } = renderIcon({ props: { route: 'simulated_made_up' } });

		await user.hover(getByTestId('agent-tool-call-route-icon'));

		await waitFor(() =>
			expect(document.querySelector('[data-test-id="tooltip-content"]')).toHaveTextContent(
				'Simulated (made up)',
			),
		);
	});

	it.each(['future_route', 'constructor', 'toString'])(
		'renders nothing for a route this client does not know (%s)',
		(route) => {
			const { queryByTestId } = renderIcon({ props: { route: route as ToolCallRoute } });

			expect(queryByTestId('agent-tool-call-route-icon')).not.toBeInTheDocument();
		},
	);
});

describe('AgentToolCallRouteRow', () => {
	it.each(ROUTE_REASON_PAIRS)('is collapsed by default for a %s call (%s)', (route, reason) => {
		const { getByTestId } = renderRow({
			props: callWith({ route, reason, detail: 'Some detail.' }),
		});

		expect(getByTestId('agent-tool-call-route-toggle')).toHaveAttribute('aria-expanded', 'false');
		expect(getByTestId('agent-tool-call-route-details')).not.toBeVisible();
	});

	it.each(ROUTE_REASON_PAIRS)(
		'shows only an icon for a %s call (%s) when collapsed',
		(route, reason) => {
			const { getByTestId, getByRole } = renderRow({ props: callWith({ route, reason }) });

			const toggle = getByTestId('agent-tool-call-route-toggle');
			expect(within(toggle).getByRole('img', { name: ROUTE_LABELS[route] })).toBeInTheDocument();
			expect(toggle).not.toHaveTextContent(ROUTE_LABELS[route]);
			// The route is part of the row's name, so it is read with the tool name.
			expect(
				getByRole('button', { name: `Send Slack message ${ROUTE_LABELS[route]}` }),
			).toBeInTheDocument();
		},
	);

	it.each(ROUTE_REASON_PAIRS)('explains a %s call (%s) when expanded', async (route, reason) => {
		const { container } = renderRow({ props: callWith({ route, reason }) });

		const details = await expand(container);

		expect(within(details).getByTestId('agent-tool-call-route-details-label')).toHaveTextContent(
			ROUTE_LABELS[route],
		);
		expect(within(details).getByTestId('agent-tool-call-route-reason')).toHaveTextContent(
			REASON_TEXT[reason],
		);
	});

	it.each(Object.entries(BLOCKED_NEXT_STEPS))(
		'says what to do next for a call blocked for %s',
		async (reason, nextStep) => {
			const { container } = renderRow({
				props: callWith({ route: 'blocked', reason: reason as ToolCallReason }),
			});

			const details = await expand(container);

			expect(within(details).getByTestId('agent-tool-call-route-next-step')).toHaveTextContent(
				nextStep,
			);
		},
	);

	it.each(['real_read', 'simulated', 'simulated_made_up'] as const)(
		'gives no next step for a %s call',
		async (route) => {
			const { container } = renderRow({
				props: callWith({ route, reason: 'served_from_world' }),
			});

			const details = await expand(container);

			expect(
				within(details).queryByTestId('agent-tool-call-route-next-step'),
			).not.toBeInTheDocument();
		},
	);

	it('makes clear that a made-up reply is not based on real data', async () => {
		const { container } = renderRow({
			props: callWith({ route: 'simulated_made_up', reason: 'invented_by_llm' }),
		});

		const details = await expand(container);

		expect(details).toHaveTextContent('Simulated (made up)');
		expect(details).toHaveTextContent("It isn't based on any real data.");
	});

	it('says a simulator gap is not an agent error', async () => {
		const { container } = renderRow({
			props: callWith({ route: 'blocked', reason: 'unsupported_by_simulator' }),
		});

		const details = await expand(container);

		expect(details).toHaveTextContent(
			'This is a gap in the simulator, not an error in your agent.',
		);
	});

	it('shows the detail from the backend', async () => {
		const { container } = renderRow({
			props: callWith({
				route: 'blocked',
				reason: 'blocked_by_policy',
				detail: '  Real reads are not available in test runs yet.  ',
			}),
		});

		const details = await expand(container);

		expect(within(details).getByTestId('agent-tool-call-route-detail')).toHaveTextContent(
			'Real reads are not available in test runs yet.',
		);
	});

	it('omits the detail when it is blank', async () => {
		const { container } = renderRow({
			props: callWith({ route: 'blocked', reason: 'not_simulatable', detail: '   ' }),
		});

		const details = await expand(container);

		expect(within(details).queryByTestId('agent-tool-call-route-detail')).not.toBeInTheDocument();
	});

	it('links the toggle to the details it controls', async () => {
		const { container, getByTestId } = renderRow({
			props: callWith({ route: 'simulated', reason: 'served_from_world' }),
		});

		const toggle = getByTestId('agent-tool-call-route-toggle');
		const controls = toggle.getAttribute('aria-controls');
		expect(controls).toBeTruthy();
		// The controlled element exists while collapsed too.
		expect(document.getElementById(controls ?? '')).toBe(
			getByTestId('agent-tool-call-route-details'),
		);

		const details = await expand(container);

		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(toggle).toHaveAttribute('aria-controls', details.id);
	});

	it('collapses again on a second click', async () => {
		const user = userEvent.setup();
		const { container, getByTestId } = renderRow({
			props: callWith({ route: 'simulated', reason: 'served_from_world' }),
		});

		const details = await expand(container);
		await user.click(getByTestId('agent-tool-call-route-toggle'));

		expect(getByTestId('agent-tool-call-route-toggle')).toHaveAttribute('aria-expanded', 'false');
		await waitFor(() => expect(details).not.toBeVisible());
	});

	it.each([
		['Enter', '{Enter}'],
		['Space', ' '],
	])('expands and collapses with %s', async (_name, key) => {
		const user = userEvent.setup();
		const { getByTestId } = renderRow({
			props: callWith({ route: 'blocked', reason: 'simulator_unavailable' }),
		});

		await user.tab();
		const toggle = getByTestId('agent-tool-call-route-toggle');
		const details = getByTestId('agent-tool-call-route-details');
		expect(toggle).toHaveFocus();

		await user.keyboard(key);
		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await waitFor(() => expect(details).toBeVisible());
		expect(getByTestId('agent-tool-call-route-next-step')).toHaveTextContent(
			BLOCKED_NEXT_STEPS.simulator_unavailable,
		);

		await user.keyboard(key);
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await waitFor(() => expect(details).not.toBeVisible());
	});

	it('is not expandable and shows no icon without a simulation result', () => {
		const { getByTestId, queryByTestId, queryByRole } = renderRow({ props: callWith() });

		expect(getByTestId('agent-tool-call-route-tool-name')).toHaveTextContent('Send Slack message');
		expect(queryByTestId('agent-tool-call-route-toggle')).not.toBeInTheDocument();
		expect(queryByRole('button')).not.toBeInTheDocument();
		expect(queryByTestId('agent-tool-call-route-icon')).not.toBeInTheDocument();
	});

	it('becomes expandable when a pending call gets its result', async () => {
		const { queryByTestId, getByTestId, rerender } = renderRow({ props: callWith() });
		expect(queryByTestId('agent-tool-call-route-toggle')).not.toBeInTheDocument();

		await rerender(callWith({ route: 'blocked', reason: 'not_simulatable' }));

		expect(getByTestId('agent-tool-call-route-toggle')).toHaveAttribute('aria-expanded', 'false');
		expect(getByTestId('agent-tool-call-route-icon')).toBeInTheDocument();
	});

	it.each(['future_route', 'constructor', 'toString'])(
		'is not expandable and shows no icon for a route this client does not know (%s)',
		(route) => {
			const { getByTestId, queryByTestId } = renderRow({
				props: callWith(unknownSimulation(route, 'served_from_world')),
			});

			expect(getByTestId('agent-tool-call-route-tool-name')).toHaveTextContent(
				'Send Slack message',
			);
			expect(getByTestId('agent-tool-call-route-row')).not.toHaveAttribute('data-route');
			expect(queryByTestId('agent-tool-call-route-toggle')).not.toBeInTheDocument();
			expect(queryByTestId('agent-tool-call-route-icon')).not.toBeInTheDocument();
		},
	);

	it('keeps the route for a reason this client does not know', async () => {
		const { container } = renderRow({
			props: callWith(unknownSimulation('simulated', 'future_reason')),
		});

		const details = await expand(container);

		expect(within(details).getByTestId('agent-tool-call-route-details-label')).toHaveTextContent(
			'Simulated',
		);
		expect(within(details).queryByTestId('agent-tool-call-route-reason')).not.toBeInTheDocument();
	});

	it.each(['reason_from_a_newer_server', 'constructor', 'toString', 'served_from_world'])(
		'falls back to the generic next step for a blocked call with reason %s',
		async (reason) => {
			const { container } = renderRow({ props: callWith(unknownSimulation('blocked', reason)) });

			const details = await expand(container);

			expect(within(details).getByTestId('agent-tool-call-route-next-step')).toHaveTextContent(
				FALLBACK_NEXT_STEP,
			);
		},
	);

	it.each([
		['with', { route: 'simulated', reason: 'served_from_world' } as ToolCallSimulation],
		['without', undefined],
	])('keeps the full name of a long tool on hover %s a simulation result', (_name, simulation) => {
		const { getByTestId } = renderRow({ props: callWith(simulation, LONG_TOOL_NAME) });

		const name = getByTestId('agent-tool-call-route-tool-name');
		expect(name).toHaveTextContent(LONG_TOOL_NAME);
		expect(name).toHaveAttribute('title', LONG_TOOL_NAME);
	});
});

describe('AgentToolCallRouteList', () => {
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

	function expandedStates(toggles: HTMLElement[]) {
		return toggles.map((toggle) => toggle.getAttribute('aria-expanded'));
	}

	it('shows each call of a turn in order with its own icon', () => {
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
			items.map(
				(item) =>
					within(item).queryByTestId('agent-tool-call-route-icon')?.getAttribute('data-route') ??
					null,
			),
		).toEqual(['real_read', 'simulated', 'simulated_made_up', 'blocked', 'blocked', null]);
	});

	it('starts with every call collapsed and no explanation shown', () => {
		const { getAllByTestId } = renderList({ props: { calls } });

		expect(expandedStates(getAllByTestId('agent-tool-call-route-toggle'))).toEqual([
			'false',
			'false',
			'false',
			'false',
			'false',
		]);
		for (const details of getAllByTestId('agent-tool-call-route-details')) {
			expect(details).not.toBeVisible();
		}
	});

	it('expands one call without expanding the others', async () => {
		const { getAllByTestId } = renderList({ props: { calls } });

		const details = await expand(getAllByTestId('agent-tool-call-route-item')[3]);

		expect(details).toHaveTextContent(REASON_TEXT.unsupported_by_simulator);
		expect(details).toHaveTextContent('The simulator does not support this call yet.');
		expect(details).toHaveTextContent(BLOCKED_NEXT_STEPS.unsupported_by_simulator);
		const allDetails = getAllByTestId('agent-tool-call-route-details');
		expect(allDetails).toHaveLength(5);
		const visible = allDetails.filter((element) => element.closest('[hidden]') === null);
		expect(visible).toEqual([details]);
		expect(expandedStates(getAllByTestId('agent-tool-call-route-toggle'))).toEqual([
			'false',
			'false',
			'false',
			'true',
			'false',
		]);
	});

	it('gives every expandable row its own details region', () => {
		const { getAllByTestId } = renderList({ props: { calls } });

		const ids = getAllByTestId('agent-tool-call-route-toggle').map((toggle) =>
			toggle.getAttribute('aria-controls'),
		);
		expect(ids.every(Boolean)).toBe(true);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('shows a call without a simulation result as a plain row', () => {
		const { getAllByTestId } = renderList({ props: { calls } });

		const lastItem = getAllByTestId('agent-tool-call-route-item')[5];
		expect(within(lastItem).getByText('Still running')).toBeInTheDocument();
		expect(within(lastItem).queryByTestId('agent-tool-call-route-toggle')).not.toBeInTheDocument();
		expect(within(lastItem).queryByTestId('agent-tool-call-route-icon')).not.toBeInTheDocument();
	});

	it('renders an empty list for a turn without tool calls', () => {
		const { getByTestId, queryAllByTestId } = renderList({ props: { calls: [] } });

		expect(getByTestId('agent-tool-call-route-list')).toBeInTheDocument();
		expect(queryAllByTestId('agent-tool-call-route-item')).toHaveLength(0);
	});
});
