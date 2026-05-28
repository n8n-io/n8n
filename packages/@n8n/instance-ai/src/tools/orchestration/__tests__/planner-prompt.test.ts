import { PLANNER_AGENT_PROMPT } from '../plan-agent-prompt';

describe('PLANNER_AGENT_PROMPT', () => {
	it('treats routine workflow verification as automatic', () => {
		expect(PLANNER_AGENT_PROMPT).toContain('Workflow verification is automatic');
		expect(PLANNER_AGENT_PROMPT).toContain('Do NOT add routine "verify this workflow" checkpoints');
		expect(PLANNER_AGENT_PROMPT).toContain('Checkpoint items are exceptional semantic checks');
		expect(PLANNER_AGENT_PROMPT).not.toContain('For **every** `workflow` item');
	});
});
