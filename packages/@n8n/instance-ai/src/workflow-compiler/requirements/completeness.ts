import type { NodeRegistry } from '../catalog/node-registry';
import type { RequirementIssue, Requirements, RequirementValue } from './types';

function issueFor(
	field: string,
	requirement: RequirementValue | undefined,
	reason: string,
): RequirementIssue | undefined {
	if (!requirement) return { field, reason, question: `Please provide ${field}.` };
	if (requirement.status === 'resolved') return undefined;
	if (requirement.status === 'missing') return { field, reason, question: requirement.question };
	return { field, reason, question: requirement.question, candidates: requirement.candidates };
}

/** Stage 1 completeness: is the requested behavior understood? Computed from the requirement state, never a model verdict. */
export function missingBehaviorRequirements(requirements: Requirements): RequirementIssue[] {
	const issues = [
		issueFor(
			'intent',
			requirements.intent,
			'The request does not say whether to create, edit or debug.',
		),
		issueFor('trigger', requirements.trigger, 'The workflow needs a trigger.'),
		...Object.entries(requirements.triggerParams).map(([name, value]) =>
			issueFor(`triggerParams.${name}`, value, 'The trigger needs this value.'),
		),
	].filter((issue) => issue !== undefined);
	if (requirements.actions.length === 0 && requirements.trigger.status === 'resolved') {
		issues.push({
			field: 'actions',
			reason: 'No action was requested.',
			question: 'What should the workflow do after it starts?',
		});
	}
	return issues;
}

/**
 * Stage 2 completeness: a selected operation may require more values (channel, table, email…).
 * Values already in the action's params or the answers map satisfy the requirement.
 */
export function missingOperationRequirements(
	requirements: Requirements,
	registry: NodeRegistry,
): RequirementIssue[] {
	const issues: RequirementIssue[] = [];
	for (const action of requirements.actions) {
		if (!action.operationId) {
			issues.push({
				field: `actions.${action.id}.operation`,
				reason: 'No operation was chosen for this action.',
				question: `Which integration and operation should handle "${action.text}"?`,
			});
			continue;
		}
		const operation = registry.get(action.operationId);
		if (!operation) continue;
		for (const definition of operation.requiredParameters) {
			if (definition.derivable) continue; // the planner or compiler supplies these
			const answerKey = `actions.${action.id}.${definition.name}`;
			const value = action.params[definition.name] ?? requirements.answers[answerKey];
			if (value === undefined || value === '') {
				issues.push({
					field: answerKey,
					reason: `Required by ${operation.title}.`,
					question:
						definition.question ??
						`What should "${definition.name}" be for ${operation.title}? (${definition.description})`,
				});
			}
		}
	}
	return issues;
}
