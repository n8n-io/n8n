import { describe, expect, it } from 'vitest';

import type {
	DecisionOutcome,
	DecisionService,
} from '../../workflow-compiler/decision/decision-service';
import { routeIntent } from '../router';
import type { IntentRoute } from '../schemas';

function reads(
	choice: IntentRoute | 'none_of_these',
	confidence = 0.95,
): DecisionService & { calls: number } {
	const service = {
		kind: 'scripted',
		calls: 0,
		async decide(): Promise<DecisionOutcome> {
			service.calls += 1;
			return {
				ok: true,
				answers: {
					route: { type: 'choice', choice, probabilities: { [choice]: confidence }, confidence },
				},
				model: 'scripted',
				latencyMs: 2,
				problems: [],
			};
		},
	};
	return service;
}

describe('routeIntent', () => {
	it('routes a pending compiler session reply without any read', async () => {
		const decisions = reads('workflow.create');
		const decision = await routeIntent({
			message: '#sales',
			state: {
				pendingSession: {
					kind: 'workflow',
					sessionId: 'gen_1',
					fields: ['actions.notify.channel'],
				},
			},
			decisions,
		});
		expect(decision).toMatchObject({ route: 'answer', source: 'pending_session', confidence: 1 });
		expect(decisions.calls).toBe(0);
	});

	it('sends small talk and pure questions to the orchestrator without a read', async () => {
		const decisions = reads('workflow.create');
		expect((await routeIntent({ message: 'thanks!', state: {}, decisions })).route).toBe(
			'orchestrator',
		);
		expect(
			(await routeIntent({ message: 'What is a webhook node?', state: {}, decisions })).route,
		).toBe('orchestrator');
		expect(decisions.calls).toBe(0);
	});

	it('takes the compiler route when the read is confident', async () => {
		const decision = await routeIntent({
			message: 'Build me a workflow: POST /customers, upsert in HubSpot, notify #sales',
			state: {},
			decisions: reads('workflow.create'),
		});
		expect(decision).toMatchObject({ route: 'workflow.create', source: 'decision' });
		expect(decision.read?.probabilities).toEqual({ 'workflow.create': 0.95 });
	});

	it('falls back to the orchestrator when the read is not confident', async () => {
		const decision = await routeIntent({
			message: 'Build me a workflow: POST /customers, upsert in HubSpot',
			state: {},
			decisions: reads('workflow.create', 0.6),
		});
		expect(decision).toMatchObject({ route: 'orchestrator', source: 'fallback' });
		expect(decision.reason).toContain('below the act threshold');
	});

	it('vetoes edit and debug routes without a bound target even when the read picks them', async () => {
		const decision = await routeIntent({
			message: 'Change the Slack channel to #ops in the workflow',
			state: {},
			decisions: reads('workflow.edit'),
		});
		expect(decision.route).toBe('orchestrator');
		const bound = await routeIntent({
			message: 'Change the Slack channel to #ops in the workflow',
			state: { boundWorkflowId: 'wf-1' },
			decisions: reads('workflow.edit'),
		});
		expect(bound.route).toBe('workflow.edit');
	});

	it('uses deterministic cues as the prior when no decision backend exists', async () => {
		const create = await routeIntent({
			message: 'Create a workflow that posts to Slack every morning at 9am',
			state: {},
		});
		expect(create).toMatchObject({ route: 'workflow.create', source: 'prior' });
		const debug = await routeIntent({
			message: 'My workflow is failing with a 401 error, please fix it',
			state: { boundWorkflowId: 'wf-1' },
		});
		expect(debug).toMatchObject({ route: 'workflow.debug', source: 'prior' });
		const agent = await routeIntent({
			message: 'Build a Slack bot that answers questions about pricing',
			state: {},
		});
		expect(agent).toMatchObject({ route: 'agent.create', source: 'prior' });
		const vague = await routeIntent({
			message: 'Can you help me with my customer data',
			state: {},
		});
		expect(vague.route).toBe('orchestrator');
	});

	it('keeps the orchestrator for messages with attachments or an active plan', async () => {
		const attachments = await routeIntent({
			message: 'Build a workflow from this spreadsheet',
			state: { hasAttachments: true },
			decisions: reads('workflow.create'),
		});
		expect(attachments.route).toBe('orchestrator');
		const plan = await routeIntent({
			message: 'Build the orders workflow',
			state: { hasActivePlan: true },
			decisions: reads('workflow.create'),
		});
		expect(plan.route).toBe('orchestrator');
	});
});
