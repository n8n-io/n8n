import { deriveInstanceContextReach, mergeInstanceContextReach } from '../instance-context-reach';
import type { ToolCallSummary } from '../work-summary-accumulator';

function call(toolName: string, action?: string, succeeded = true): ToolCallSummary {
	return { toolCallId: `${toolName}:${action ?? 'none'}`, toolName, action, succeeded };
}

describe('deriveInstanceContextReach', () => {
	it('reports the block alone when no context surface was called', () => {
		expect(deriveInstanceContextReach([])).toEqual({ surfaces: [] });
	});

	it('ignores tool calls that are not context surfaces', () => {
		expect(
			deriveInstanceContextReach([call('workflows', 'publish'), call('credentials', 'list')]),
		).toEqual({ surfaces: [] });
	});

	it('reports listing activity', () => {
		expect(deriveInstanceContextReach([call('activity', 'list')])).toEqual({
			surfaces: ['activity-list'],
		});
	});

	it.each([
		['activity', 'expand', 'activity-expand'],
		['workflows', 'node-usage', 'node-usage'],
	] as const)('reports %s(%s)', (toolName, action, surface) => {
		expect(deriveInstanceContextReach([call(toolName, action)])).toEqual({
			surfaces: [surface],
		});
	});

	it.each(['get', 'get-as-code'])('reports a full workflow read (%s)', (action) => {
		expect(deriveInstanceContextReach([call('workflows', action)])).toEqual({
			surfaces: ['workflow-read'],
		});
	});

	it('reports every surface the turn used, in first-call order', () => {
		expect(
			deriveInstanceContextReach([
				call('activity', 'list'),
				call('workflows', 'node-usage'),
				call('workflows', 'get'),
			]),
		).toEqual({
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
		).toEqual({ surfaces: ['activity-expand', 'activity-list'] });
	});

	/**
	 * A turn that tried to read deeper and failed still went looking. Dropping it would
	 * hide exactly the cases where a surface is broken or too hard for the agent to call.
	 */
	it('counts a surface the agent reached for even when the call failed', () => {
		expect(deriveInstanceContextReach([call('activity', 'expand', false)])).toEqual({
			surfaces: ['activity-expand'],
		});
	});

	/**
	 * The node-usage index has two entrances and one flag over both, so a turn that took
	 * the cheaper one still left the block.
	 */
	it('credits narrowing the workflow list by node type as node-usage', () => {
		expect(
			deriveInstanceContextReach([
				{ ...call('workflows', 'list'), filteredByNodeTypes: true as const },
			]),
		).toEqual({ surfaces: ['node-usage'] });
	});

	it('reports nothing for an unfiltered list, since it read no index', () => {
		expect(deriveInstanceContextReach([call('workflows', 'list')])).toEqual({
			surfaces: [],
		});
	});

	it('does not double-count both entrances to node-usage in one turn', () => {
		expect(
			deriveInstanceContextReach([
				{ ...call('workflows', 'list'), filteredByNodeTypes: true as const },
				call('workflows', 'node-usage'),
			]),
		).toEqual({ surfaces: ['node-usage'] });
	});

	it('ignores a context tool called without an action', () => {
		expect(deriveInstanceContextReach([call('activity', undefined)])).toEqual({
			surfaces: [],
		});
	});
});

describe('mergeInstanceContextReach', () => {
	it('returns the later segment when there was no earlier one', () => {
		expect(mergeInstanceContextReach(undefined, { surfaces: ['activity-list'] })).toEqual({
			surfaces: ['activity-list'],
		});
	});

	/**
	 * A turn that stops for a confirmation runs in segments with separate work summaries.
	 * The reads after an approval are often the deepest, so neither segment may win.
	 */
	it("keeps both segments' surfaces, earlier ones first", () => {
		expect(
			mergeInstanceContextReach({ surfaces: ['activity-list'] }, { surfaces: ['workflow-read'] }),
		).toEqual({ surfaces: ['activity-list', 'workflow-read'] });
	});

	it('does not repeat a surface both segments used', () => {
		expect(
			mergeInstanceContextReach(
				{ surfaces: ['activity-expand'] },
				{ surfaces: ['activity-expand', 'node-usage'] },
			),
		).toEqual({ surfaces: ['activity-expand', 'node-usage'] });
	});

	it('accumulates over more than two segments, for a turn that asks twice', () => {
		const first = mergeInstanceContextReach(undefined, { surfaces: ['activity-list'] });
		const second = mergeInstanceContextReach(first, { surfaces: ['activity-expand'] });

		expect(mergeInstanceContextReach(second, { surfaces: ['workflow-read'] })).toEqual({
			surfaces: ['activity-list', 'activity-expand', 'workflow-read'],
		});
	});

	it('leaves the earlier segment untouched', () => {
		const earlier = { surfaces: ['activity-list'] as const };
		mergeInstanceContextReach({ surfaces: [...earlier.surfaces] }, { surfaces: ['node-usage'] });

		expect(earlier.surfaces).toEqual(['activity-list']);
	});
});
