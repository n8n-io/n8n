import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { scriptedDecisions } from '../../__tests__/scripted-decisions';
import { NullDecisionService } from '../../workflow-compiler/decision/decision-service';
import { isSmallTalk, scoreCues, vetoedRoutes } from '../features';
import { routeIntent } from '../router';
import { INTENT_ROUTES, type RouterState } from '../schemas';

/** Property-based checks (fast-check) for the intent router invariants. */

const message = fc.oneof(
	fc.string({ maxLength: 80 }),
	fc
		.tuple(
			fc.constantFrom('create', 'build', 'fix', 'change', 'test', 'what is', 'hi', 'add'),
			fc.constantFrom('a workflow', 'an agent', 'the bot', 'my workflow', 'a webhook', '?'),
			fc.constantFrom('', ' that posts to slack', ' when a lead arrives', ' please', '?'),
		)
		.map((parts) => parts.join(' ')),
);

const state: fc.Arbitrary<RouterState> = fc.record(
	{
		pendingSession: fc.record({
			kind: fc.constantFrom('workflow' as const, 'agent' as const),
			sessionId: fc.constant('s1'),
			fields: fc.array(fc.constant('field'), { maxLength: 2 }),
		}),
		boundWorkflowId: fc.constant('wf-1'),
		boundAgentRef: fc.constant('agent-1'),
		hasAttachments: fc.boolean(),
		hasActivePlan: fc.boolean(),
	},
	{ requiredKeys: [] },
);

describe('routeIntent', () => {
	it('always yields a known route within [0,1] confidence and never a vetoed route', async () => {
		await fc.assert(
			fc.asyncProperty(
				message,
				state,
				fc.constantFrom(...INTENT_ROUTES),
				async (text, s, choice) => {
					const decisions = scriptedDecisions({ route: choice });
					const decision = await routeIntent({ message: text, state: s, decisions });
					expect(INTENT_ROUTES).toContain(decision.route);
					expect(decision.confidence).toBeGreaterThanOrEqual(0);
					expect(decision.confidence).toBeLessThanOrEqual(1);
					expect(decision.route in vetoedRoutes(s)).toBe(false);
					if (s.pendingSession) {
						expect(decision).toMatchObject({ route: 'answer', source: 'pending_session' });
						expect(decisions.requests).toHaveLength(0);
						return;
					}
					expect(decision.route).not.toBe('answer');
					if (isSmallTalk(text)) {
						expect(decision).toMatchObject({ route: 'orchestrator', source: 'rule' });
						expect(decisions.requests).toHaveLength(0);
						return;
					}
					// A read can only produce the route it chose, or hand the turn to the orchestrator.
					if (decisions.requests.length > 0)
						expect([choice, 'orchestrator']).toContain(decision.route);
					expect(decisions.requests.length).toBeLessThanOrEqual(1);
				},
			),
			{ numRuns: 200 },
		);
	});

	it('without a backend, only a decisive cue leaves the orchestrator', async () => {
		await fc.assert(
			fc.asyncProperty(message, state, async (text, s) => {
				const decision = await routeIntent({
					message: text,
					state: s,
					decisions: new NullDecisionService(),
				});
				if (decision.route === 'orchestrator' || decision.route === 'answer') return;
				expect(decision.source).toBe('prior');
				expect(scoreCues(text).scores[decision.route] ?? 0).toBeGreaterThanOrEqual(3);
			}),
			{ numRuns: 200 },
		);
	});
});
