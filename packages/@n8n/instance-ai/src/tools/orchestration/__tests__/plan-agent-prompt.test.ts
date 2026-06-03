import { PLANNER_AGENT_PROMPT } from '../plan-agent-prompt';

describe('planner agent prompt', () => {
	it('keeps checkpoint verification separate from user-requested runs', () => {
		expect(PLANNER_AGENT_PROMPT).toContain('Use `verify-built-workflow`');
		expect(PLANNER_AGENT_PROMPT).toContain(
			'Do not put `executions(action="run")` in checkpoint instructions',
		);
		expect(PLANNER_AGENT_PROMPT).toContain('separate approval-gated run');
	});
});
