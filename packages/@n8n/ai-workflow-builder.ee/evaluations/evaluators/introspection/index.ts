import {
	getIntrospectionEvents,
	clearIntrospectionEvents,
	type IntrospectionEvent,
} from '@/tools/introspect.tool';
import type { SimpleWorkflow } from '@/types/workflow';

import type { EvaluationContext, Evaluator, Feedback } from '../../harness/harness-types';

// Re-export for convenience
export type { IntrospectionEvent };
export { getIntrospectionEvents, clearIntrospectionEvents };

/**
 * Evaluator that collects introspection events from the global store.
 * Events are captured directly by the introspect tool during workflow generation.
 *
 * IMPORTANT: The generator should call clearIntrospectionEvents() before each run
 * to ensure events from previous runs don't leak into the current evaluation.
 * The evaluator retrieves events after generation completes and clears for the next run.
 */
export function createIntrospectionEvaluator(): Evaluator<EvaluationContext> {
	return {
		name: 'introspection',
		async evaluate(_workflow: SimpleWorkflow, _ctx: EvaluationContext): Promise<Feedback[]> {
			// Get events from the global store and clear for next run
			const events = getIntrospectionEvents();
			clearIntrospectionEvents();

			if (events.length === 0) {
				return [
					{
						evaluator: 'introspection',
						metric: 'event_count',
						score: 0,
						kind: 'metric',
						comment: 'No introspection events',
					},
				];
			}

			// Summary feedback
			const feedback: Feedback[] = [
				{
					evaluator: 'introspection',
					metric: 'event_count',
					score: events.length,
					kind: 'metric',
					comment: `${events.length} introspection event(s)`,
				},
			];

			// Individual events as details
			for (const event of events) {
				feedback.push({
					evaluator: 'introspection',
					metric: event.category,
					score: 1,
					kind: 'detail',
					comment: event.issue,
					details: {
						category: event.category,
						source: event.source,
						timestamp: event.timestamp,
					},
				});
			}

			return feedback;
		},
	};
}
