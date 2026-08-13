import type { AgentGoalConfig } from '@n8n/api-types';

import type { GoalExpressionContext } from './expressions';
import { evaluateGoalExpression, isTruthy } from './expressions';
import type { GoalStatuses, GoalStatusChange, SlotValues } from './types';

export type ExpressionEvaluator = (expression: string, context: GoalExpressionContext) => unknown;

/**
 * Derive goal statuses from the current state. Statuses are a pure function
 * of slot values — nothing is stored, so regression is automatic (clearing a
 * slot un-achieves the goal and re-locks everything that depended on it).
 *
 * Per goal: **Achieved** if `achievedWhen($state)` is truthy; else **Failed**
 * if `failedWhen($state)` is truthy (Achieved deliberately wins, so "third
 * verification attempt succeeds" still achieves); else **Active** when all
 * `requires` goals are Achieved and `unlockedWhen($state)` (when present)
 * holds; else **Locked**.
 */
export function deriveGoalStatuses(
	goals: AgentGoalConfig[],
	state: SlotValues,
	evaluate: ExpressionEvaluator = evaluateGoalExpression,
): GoalStatuses {
	const context: GoalExpressionContext = { state };

	// First pass: achieved/failed are independent of other goals.
	const achieved = new Set<string>();
	const failed = new Set<string>();
	for (const goal of goals) {
		if (goal.achievedWhen && isTruthy(evaluate(goal.achievedWhen, context))) {
			achieved.add(goal.id);
		} else if (goal.failedWhen && isTruthy(evaluate(goal.failedWhen, context))) {
			failed.add(goal.id);
		}
	}

	// Second pass: active/locked depend on prerequisites' achieved state only,
	// so a single pass suffices (no recursion).
	const statuses: GoalStatuses = {};
	for (const goal of goals) {
		if (achieved.has(goal.id)) {
			statuses[goal.id] = 'achieved';
			continue;
		}
		if (failed.has(goal.id)) {
			statuses[goal.id] = 'failed';
			continue;
		}
		const prerequisitesMet = (goal.requires ?? []).every((id) => achieved.has(id));
		const unlocked =
			prerequisitesMet && (!goal.unlockedWhen || isTruthy(evaluate(goal.unlockedWhen, context)));
		statuses[goal.id] = unlocked ? 'active' : 'locked';
	}

	return statuses;
}

/** Diff two status maps into a list of per-goal changes. */
export function diffGoalStatuses(before: GoalStatuses, after: GoalStatuses): GoalStatusChange[] {
	const changes: GoalStatusChange[] = [];
	for (const [goalId, to] of Object.entries(after)) {
		const from = before[goalId];
		if (from !== undefined && from !== to) {
			changes.push({ goalId, from, to });
		}
	}
	return changes;
}
