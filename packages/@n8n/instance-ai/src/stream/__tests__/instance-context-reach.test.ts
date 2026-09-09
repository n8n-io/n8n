import { deriveInstanceContextReach } from '../instance-context-reach';
import type { ToolCallSummary } from '../work-summary-accumulator';

function call(toolName: string, action?: string, succeeded = true): ToolCallSummary {
	return { toolCallId: `${toolName}:${action ?? 'none'}`, toolName, action, succeeded };
}

describe('deriveInstanceContextReach', () => {
	it('reports the block alone when no context surface was called', () => {
		expect(deriveInstanceContextReach([])).toEqual({ depth: 0, surfaces: [] });
	});

	it('ignores tool calls that are not context surfaces', () => {
		expect(
			deriveInstanceContextReach([call('workflows', 'publish'), call('credentials', 'list')]),
		).toEqual({ depth: 0, surfaces: [] });
	});

	it('reports listing activity as the first rung', () => {
		expect(deriveInstanceContextReach([call('activity', 'list')])).toEqual({
			depth: 1,
			surfaces: ['activity-list'],
		});
	});

	it.each([
		['activity', 'expand', 'activity-expand'],
		['workflows', 'node-usage', 'node-usage'],
	] as const)('reports %s(%s) at the same depth', (toolName, action, surface) => {
		expect(deriveInstanceContextReach([call(toolName, action)])).toEqual({
			depth: 2,
			surfaces: [surface],
		});
	});

	it.each(['get', 'get-as-code'])(
		'reports a full workflow read (%s) as the deepest rung',
		(action) => {
			expect(deriveInstanceContextReach([call('workflows', action)])).toEqual({
				depth: 3,
				surfaces: ['workflow-read'],
			});
		},
	);

	it('reports the deepest rung reached, and every surface used to get there', () => {
		expect(
			deriveInstanceContextReach([
				call('activity', 'list'),
				call('workflows', 'node-usage'),
				call('workflows', 'get'),
			]),
		).toEqual({
			depth: 3,
			surfaces: ['activity-list', 'node-usage', 'workflow-read'],
		});
	});

	it('de-duplicates a surface called more than once, keeping first-call order', () => {
		expect(
			deriveInstanceContextReach([
				call('activity', 'expand'),
				call('activity', 'list'),
				{ ...call('activity', 'expand'), toolCallId: 'second-expand' },
			]),
		).toEqual({ depth: 2, surfaces: ['activity-expand', 'activity-list'] });
	});

	/**
	 * A turn that tried to read deeper and failed still went looking. Dropping it would
	 * hide exactly the cases where a surface is broken or too hard for the agent to call.
	 */
	it('counts a surface the agent reached for even when the call failed', () => {
		expect(deriveInstanceContextReach([call('activity', 'expand', false)])).toEqual({
			depth: 2,
			surfaces: ['activity-expand'],
		});
	});

	/**
	 * The node-usage index has two entrances and one flag over both, so a turn that took
	 * the cheaper one still left the block.
	 */
	it('credits narrowing the workflow list by node type as reaching node-usage', () => {
		expect(
			deriveInstanceContextReach([
				{ ...call('workflows', 'list'), filteredByNodeTypes: true as const },
			]),
		).toEqual({ depth: 2, surfaces: ['node-usage'] });
	});

	it('leaves an unfiltered list at the block, since it read no index', () => {
		expect(deriveInstanceContextReach([call('workflows', 'list')])).toEqual({
			depth: 0,
			surfaces: [],
		});
	});

	it('does not double-count both entrances to node-usage in one turn', () => {
		expect(
			deriveInstanceContextReach([
				{ ...call('workflows', 'list'), filteredByNodeTypes: true as const },
				call('workflows', 'node-usage'),
			]),
		).toEqual({ depth: 2, surfaces: ['node-usage'] });
	});

	it('ignores a context tool called without an action', () => {
		expect(deriveInstanceContextReach([call('activity', undefined)])).toEqual({
			depth: 0,
			surfaces: [],
		});
	});
});
