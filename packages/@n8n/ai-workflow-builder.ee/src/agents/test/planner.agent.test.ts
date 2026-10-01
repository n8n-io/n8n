import { parsePlanDecision, plannerOutputSchema } from '../planner.agent';

describe('parsePlanDecision', () => {
	it('returns approve for valid approve action', () => {
		expect(parsePlanDecision({ action: 'approve' })).toEqual({ action: 'approve' });
	});

	it('returns reject for valid reject action', () => {
		expect(parsePlanDecision({ action: 'reject' })).toEqual({ action: 'reject' });
	});

	it('returns modify with feedback', () => {
		expect(parsePlanDecision({ action: 'modify', feedback: 'Add error handling' })).toEqual({
			action: 'modify',
			feedback: 'Add error handling',
		});
	});

	it('returns modify without feedback when feedback is not a string', () => {
		expect(parsePlanDecision({ action: 'modify', feedback: 123 })).toEqual({
			action: 'modify',
		});
	});

	it('returns modify without feedback when feedback is missing', () => {
		expect(parsePlanDecision({ action: 'modify' })).toEqual({ action: 'modify' });
	});

	it('defaults to reject for invalid action string', () => {
		const result = parsePlanDecision({ action: 'invalid' });
		expect(result.action).toBe('reject');
		expect(result.feedback).toContain('expected action');
	});

	it('defaults to reject for null input', () => {
		const result = parsePlanDecision(null);
		expect(result.action).toBe('reject');
		expect(result.feedback).toContain('expected an object');
	});

	it('defaults to reject for undefined input', () => {
		const result = parsePlanDecision(undefined);
		expect(result.action).toBe('reject');
		expect(result.feedback).toContain('expected an object');
	});

	it('defaults to reject for non-object input', () => {
		const result = parsePlanDecision('approve');
		expect(result.action).toBe('reject');
		expect(result.feedback).toContain('expected an object');
	});

	it('defaults to reject when action is missing', () => {
		const result = parsePlanDecision({ feedback: 'something' });
		expect(result.action).toBe('reject');
		expect(result.feedback).toContain('expected action');
	});

	it('ignores extra properties', () => {
		expect(parsePlanDecision({ action: 'approve', extra: true })).toEqual({
			action: 'approve',
		});
	});
});

describe('plannerOutputSchema', () => {
	const validPlan = {
		summary: 'Check weather and send Slack alert',
		trigger: 'Daily at 7 AM',
		steps: [
			{ description: 'Fetch weather forecast' },
			{ description: 'Send Slack notification if rain expected' },
		],
	};

	it('accepts a valid plan', () => {
		const result = plannerOutputSchema.safeParse(validPlan);
		expect(result.success).toBe(true);
	});

	it('accepts steps with optional subSteps and suggestedNodes', () => {
		const result = plannerOutputSchema.safeParse({
			...validPlan,
			steps: [
				{
					description: 'Process data',
					subSteps: ['Validate', 'Transform'],
					suggestedNodes: ['n8n-nodes-base.if'],
				},
			],
		});
		expect(result.success).toBe(true);
	});

	it('accepts plan with additionalSpecs', () => {
		const result = plannerOutputSchema.safeParse({
			...validPlan,
			additionalSpecs: ['Need API key for OpenWeatherMap'],
		});
		expect(result.success).toBe(true);
	});

	it('rejects when summary is missing', () => {
		const { summary: _, ...noSummary } = validPlan;
		const result = plannerOutputSchema.safeParse(noSummary);
		expect(result.success).toBe(false);
	});

	it('rejects when trigger is missing', () => {
		const { trigger: _, ...noTrigger } = validPlan;
		const result = plannerOutputSchema.safeParse(noTrigger);
		expect(result.success).toBe(false);
	});

	it('rejects when steps is missing', () => {
		const { steps: _, ...noSteps } = validPlan;
		const result = plannerOutputSchema.safeParse(noSteps);
		expect(result.success).toBe(false);
	});

	it('rejects empty steps array (min 1)', () => {
		const result = plannerOutputSchema.safeParse({ ...validPlan, steps: [] });
		expect(result.success).toBe(false);
	});

	it('rejects step without description', () => {
		const result = plannerOutputSchema.safeParse({
			...validPlan,
			steps: [{ suggestedNodes: ['n8n-nodes-base.if'] }],
		});
		expect(result.success).toBe(false);
	});
});
