import { PLANNER_AGENT_PROMPT } from '../plan-agent-prompt';

describe('planner agent prompt', () => {
	it('keeps checkpoint verification separate from user-requested runs', () => {
		expect(PLANNER_AGENT_PROMPT).toContain(
			'First inspect the persisted workflow with `workflows(action="get-json")`',
		);
		expect(PLANNER_AGENT_PROMPT).toContain('build/save success alone is not proof of quality');
		expect(PLANNER_AGENT_PROMPT).toContain('use `verify-built-workflow`');
		expect(PLANNER_AGENT_PROMPT).toContain(
			'Do not put `executions(action="run")` in checkpoint instructions',
		);
		expect(PLANNER_AGENT_PROMPT).toContain('separate approval-gated run');
	});
});
