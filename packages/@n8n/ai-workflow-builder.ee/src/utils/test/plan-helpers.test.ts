import type { PlanOutput } from '@/types/planning';

import { formatPlanAsText } from '../plan-helpers';

const makePlan = (overrides: Partial<PlanOutput> = {}): PlanOutput => ({
	summary: 'Send a daily weather alert via Slack',
	trigger: 'Runs every morning at 7 AM',
	steps: [
		{ description: 'Fetch the weather forecast for the configured city' },
		{ description: 'Send a Slack message with the forecast summary' },
	],
	...overrides,
});

describe('formatPlanAsText', () => {
	it('formats a basic plan with summary, trigger, and steps', () => {
		const result = formatPlanAsText(makePlan());

		expect(result).toContain('Summary: Send a daily weather alert via Slack');
		expect(result).toContain('Trigger: Runs every morning at 7 AM');
		expect(result).toContain('1. Fetch the weather forecast');
		expect(result).toContain('2. Send a Slack message');
	});

	it('includes sub-steps as indented bullets', () => {
		const result = formatPlanAsText(
			makePlan({
				steps: [
					{
						description: 'Process incoming data',
						subSteps: ['Validate the payload', 'Transform to the target format'],
					},
				],
			}),
		);

		expect(result).toContain('1. Process incoming data');
		expect(result).toContain('   - Validate the payload');
		expect(result).toContain('   - Transform to the target format');
	});

	it('includes suggestedNodes line per step', () => {
		const result = formatPlanAsText(
			makePlan({
				steps: [
					{
						description: 'Send email',
						suggestedNodes: ['n8n-nodes-base.gmail', 'n8n-nodes-base.sendEmail'],
					},
				],
			}),
		);

		expect(result).toContain('Suggested nodes: n8n-nodes-base.gmail, n8n-nodes-base.sendEmail');
	});

	it('includes additionalSpecs section', () => {
		const result = formatPlanAsText(
			makePlan({
				additionalSpecs: [
					'You will need a Gmail API key',
					'Slack workspace must allow bot messages',
				],
			}),
		);

		expect(result).toContain('Additional specs / assumptions:');
		expect(result).toContain('- You will need a Gmail API key');
		expect(result).toContain('- Slack workspace must allow bot messages');
	});

	it('omits additionalSpecs section when array is empty', () => {
		const result = formatPlanAsText(makePlan({ additionalSpecs: [] }));

		expect(result).not.toContain('Additional specs');
	});

	it('omits additionalSpecs section when undefined', () => {
		const result = formatPlanAsText(makePlan({ additionalSpecs: undefined }));

		expect(result).not.toContain('Additional specs');
	});

	it('handles a minimal plan (one step, no optional fields)', () => {
		const result = formatPlanAsText({
			summary: 'Simple webhook responder',
			trigger: 'Webhook POST request',
			steps: [{ description: 'Return a 200 OK response' }],
		});

		expect(result).toBe(
			[
				'Summary: Simple webhook responder',
				'Trigger: Webhook POST request',
				'',
				'Steps:',
				'1. Return a 200 OK response',
			].join('\n'),
		);
	});

	it('handles steps with both subSteps and suggestedNodes', () => {
		const result = formatPlanAsText(
			makePlan({
				steps: [
					{
						description: 'Check conditions and route',
						subSteps: ['Evaluate temperature threshold'],
						suggestedNodes: ['n8n-nodes-base.if'],
					},
				],
			}),
		);

		const lines = result.split('\n');
		const stepIndex = lines.findIndex((l) => l.startsWith('1.'));
		// Sub-step should come before suggested nodes
		expect(lines[stepIndex + 1]).toBe('   - Evaluate temperature threshold');
		expect(lines[stepIndex + 2]).toBe('   Suggested nodes: n8n-nodes-base.if');
	});
});
