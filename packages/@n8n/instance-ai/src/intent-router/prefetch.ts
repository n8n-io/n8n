import { detectEditKind } from '../agent-compiler/modes/edit';
import { extractAgentRequirements } from '../agent-compiler/requirements/extract';
import type { NodeRegistry } from '../workflow-compiler/catalog/node-registry';
import type { DecisionService } from '../workflow-compiler/decision/decision-service';
import { planActions } from '../workflow-compiler/modes/plan-actions';
import { extractRequirements } from '../workflow-compiler/requirements/extract';
import { isQuestionOnly, isSmallTalk, scoreCues, vetoedRoutes } from './features';
import type { RouterState } from './schemas';

/** Read likely operations with the route. This does not compile or save an artifact. */
export async function prefetchOperations(input: {
	message: string;
	state: RouterState;
	registry: NodeRegistry;
	decisions: DecisionService;
	abortSignal?: AbortSignal;
}): Promise<void> {
	const { message, state, registry, decisions, abortSignal } = input;
	if (state.pendingSession || isSmallTalk(message) || isQuestionOnly(message)) return;
	const { scores } = scoreCues(message);
	const vetoes = vetoedRoutes(state);
	const actions = [];
	if (scores['workflow.create'] && !vetoes['workflow.create'])
		actions.push(extractRequirements(message).actions);
	if (scores['agent.create'] && !vetoes['agent.create'])
		actions.push(extractAgentRequirements(message).toolActions);
	if (scores['agent.edit'] && !vetoes['agent.edit'] && detectEditKind(message) === 'add_tool') {
		const { toolActions } = extractAgentRequirements(message);
		actions.push(
			toolActions.length > 0
				? toolActions.slice(0, 1)
				: [{ id: 'new-tool', text: message, params: {} }],
		);
	}
	await Promise.all(
		actions.map(
			async (requested) =>
				await planActions({
					request: message,
					actions: requested,
					registry,
					decisions,
					abortSignal,
				}),
		),
	);
}
