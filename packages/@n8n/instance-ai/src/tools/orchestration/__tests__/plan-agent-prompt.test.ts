import { PLANNER_AGENT_PROMPT } from '../plan-agent-prompt';

describe('planner agent prompt', () => {
	it('keeps routine workflow verification out of planner checkpoints', () => {
		expect(PLANNER_AGENT_PROMPT).toContain('Workflow verification is automatic');
		expect(PLANNER_AGENT_PROMPT).toContain('Do NOT add routine "verify this workflow" checkpoints');
		expect(PLANNER_AGENT_PROMPT).toContain('Checkpoint items are exceptional semantic checks');
		expect(PLANNER_AGENT_PROMPT).not.toContain('Workflow verification is mandatory');
	});
});
