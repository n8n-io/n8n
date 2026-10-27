import type { AgentPlanDocument } from './agent-plan.schema';

export function planLeaves(document: AgentPlanDocument) {
	return document.items.flatMap((item) =>
		item.kind === 'group' && item.tasks.length > 0 ? item.tasks : [item],
	);
}
