import { createPlanTool } from '../orchestration/plan.tool';

describe('plan tool', () => {
	it('allows a single planned workflow task for template adaptation', () => {
		const tool = createPlanTool({} as never);

		expect(tool.description).toContain(
			'Use ONLY when the work requires 2 or more tasks with dependencies',
		);
		expect(tool.description).toContain('Template adaptation is the exception');
		expect(tool.description).toContain(
			'you MAY use it for a single build-workflow task after the user has chosen a template and answered clarification questions',
		);
	});
});
