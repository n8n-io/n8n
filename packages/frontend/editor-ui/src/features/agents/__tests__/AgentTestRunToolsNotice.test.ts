import { configure, fireEvent, within } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import AgentTestRunChangesNote from '../components/AgentTestRunChangesNote.vue';
import AgentTestRunToolsNotice from '../components/AgentTestRunToolsNotice.vue';
import type { ToolTestCapability } from '../testRunTools.types';

configure({ testIdAttribute: 'data-testid' });

const renderNotice = createComponentRenderer(AgentTestRunToolsNotice);

function blockedTool(index: number): ToolTestCapability {
	return {
		toolName: `blocked_tool_${index}`,
		kind: 'node',
		testability: 'blocked',
		reason: 'not_simulatable',
	};
}

describe('AgentTestRunToolsNotice', () => {
	it('renders nothing when no tool needs a callout', () => {
		const empty = renderNotice({ props: { tools: [] } });
		expect(empty.queryByTestId('agent-test-run-tools')).not.toBeInTheDocument();

		const simulatedOnly = renderNotice({
			props: {
				tools: [{ toolName: 'send_email', kind: 'node', testability: 'simulated' }],
			},
		});
		expect(simulatedOnly.queryByTestId('agent-test-run-tools')).not.toBeInTheDocument();
	});

	it('lists blocked tools with a short reason and leaves simulated tools out', () => {
		const { getByTestId, getAllByTestId, queryByText } = renderNotice({
			props: {
				tools: [
					{ toolName: 'send_email', kind: 'node', testability: 'simulated' },
					{
						toolName: 'delete_records',
						kind: 'mcp',
						testability: 'blocked',
						reason: 'blocked_by_policy',
					},
					{
						toolName: 'run_code',
						kind: 'custom',
						testability: 'blocked',
						reason: 'not_simulatable',
						detail: 'Runs arbitrary code',
					},
					{ toolName: 'mystery', kind: 'other', testability: 'blocked' },
				],
			},
		});

		const group = getByTestId('agent-test-run-tools-blocked');
		expect(group).toHaveTextContent('Not available in test runs');
		expect(group).toHaveTextContent("The agent can't use these tools while you test it.");
		expect(queryByText('send_email')).not.toBeInTheDocument();

		const rows = getAllByTestId('agent-test-run-tool');
		expect(rows).toHaveLength(3);
		expect(within(rows[0]).getByTestId('agent-test-run-tool-name')).toHaveTextContent(
			'delete_records',
		);
		expect(rows[0]).toHaveTextContent('MCP server');
		expect(within(rows[0]).getByTestId('agent-test-run-tool-reason')).toHaveTextContent(
			'Blocked by a policy',
		);
		expect(within(rows[1]).getByTestId('agent-test-run-tool-reason')).toHaveTextContent(
			"Can't be simulated",
		);
		expect(within(rows[1]).getByTestId('agent-test-run-tool-detail')).toHaveTextContent(
			'Runs arbitrary code',
		);
		// A blocked tool without a reason still gets a short explanation.
		expect(within(rows[2]).getByTestId('agent-test-run-tool-reason')).toHaveTextContent(
			'Not available in test runs',
		);
		expect(within(rows[2]).queryByTestId('agent-test-run-tool-detail')).not.toBeInTheDocument();
	});

	it('calls out tools that read real data in their own group', () => {
		const { getByTestId, queryByTestId } = renderNotice({
			props: {
				tools: [
					{
						toolName: 'get_customer',
						kind: 'integration',
						testability: 'read_for_real',
						reason: 'real_read_allowed',
					},
				],
			},
		});

		expect(queryByTestId('agent-test-run-tools-blocked')).not.toBeInTheDocument();
		const group = getByTestId('agent-test-run-tools-read_for_real');
		expect(group).toHaveTextContent('Reads real data');
		expect(group).toHaveTextContent('get_customer');
		expect(group).toHaveTextContent('Reads real data and changes nothing');
	});

	it('collapses a long list and expands it on request', async () => {
		const tools = Array.from({ length: 12 }, (_, index) => blockedTool(index));
		const { getAllByTestId, getByTestId } = renderNotice({ props: { tools } });

		expect(getAllByTestId('agent-test-run-tool')).toHaveLength(3);
		const toggle = getByTestId('agent-test-run-tools-toggle');
		expect(toggle).toHaveTextContent('Show 9 more');
		expect(toggle).toHaveAttribute('aria-expanded', 'false');

		await fireEvent.click(toggle);
		expect(getAllByTestId('agent-test-run-tool')).toHaveLength(12);
		expect(toggle).toHaveTextContent('Show less');
		expect(toggle).toHaveAttribute('aria-expanded', 'true');

		await fireEvent.click(toggle);
		expect(getAllByTestId('agent-test-run-tool')).toHaveLength(3);
	});

	it('shows no toggle when the list fits', () => {
		const tools = Array.from({ length: 3 }, (_, index) => blockedTool(index));
		const { getAllByTestId, queryByTestId } = renderNotice({ props: { tools } });

		expect(getAllByTestId('agent-test-run-tool')).toHaveLength(3);
		expect(queryByTestId('agent-test-run-tools-toggle')).not.toBeInTheDocument();
	});

	it('keeps the full name of a long tool available when the row truncates it', () => {
		const toolName = `mcp_server_${'very_long_segment_'.repeat(12)}end`;
		const { getByTestId } = renderNotice({
			props: { tools: [{ toolName, kind: 'mcp', testability: 'blocked' }] },
		});

		const name = getByTestId('agent-test-run-tool-name');
		expect(name).toHaveTextContent(toolName);
		expect(name).toHaveAttribute('title', toolName);
	});
});

describe('AgentTestRunToolsNotice with newer wire values', () => {
	it.each(['reason_from_a_newer_server', 'constructor', 'toString'])(
		'falls back to the generic blocked reason for an unknown reason (%s)',
		(reason) => {
			const { getByTestId } = renderNotice({
				props: {
					tools: [
						{
							toolName: 'odd_tool',
							kind: 'node',
							testability: 'blocked',
							reason: reason as ToolTestCapability['reason'],
						},
					],
				},
			});

			const list = getByTestId('agent-test-run-tools');
			expect(list).toHaveTextContent('odd_tool');
			expect(list.textContent).not.toContain('function');
			expect(list.textContent).not.toContain('undefined');
		},
	);

	it('lists a tool with an unknown testability as not available instead of hiding it', () => {
		const { getByTestId } = renderNotice({
			props: {
				tools: [
					{
						toolName: 'mystery_tool',
						kind: 'node',
						testability: 'partially_simulated' as ToolTestCapability['testability'],
					},
				],
			},
		});

		const list = getByTestId('agent-test-run-tools');
		expect(list).toHaveTextContent('mystery_tool');
		expect(list).toHaveTextContent('Not available in test runs');
	});

	it('labels an unknown tool kind as a generic tool', () => {
		const { getByTestId } = renderNotice({
			props: {
				tools: [
					{
						toolName: 'future_tool',
						kind: 'hologram' as ToolTestCapability['kind'],
						testability: 'blocked',
					},
					{
						toolName: 'odd_tool',
						kind: 'constructor' as ToolTestCapability['kind'],
						testability: 'blocked',
					},
				],
			},
		});

		const list = getByTestId('agent-test-run-tools');
		expect(list).toHaveTextContent('future_tool');
		expect(list).toHaveTextContent('odd_tool');
		expect(list.textContent).toContain('Tool');
		expect(list.textContent).not.toContain('undefined');
		expect(list.textContent).not.toContain('function');
	});
});

describe('AgentTestRunChangesNote', () => {
	it('says how long simulated changes last', () => {
		const { getByTestId } = createComponentRenderer(AgentTestRunChangesNote)();
		expect(getByTestId('agent-test-run-changes-note')).toHaveTextContent(
			'Simulated changes stay in this test chat. The agent treats them as sent until you start a new test run.',
		);
	});
});
