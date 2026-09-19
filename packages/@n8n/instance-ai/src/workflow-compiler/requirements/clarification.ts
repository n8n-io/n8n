import type { RequirementIssue } from './types';

export interface ClarificationQuestion {
	/** Requirement paths this question resolves. */
	fields: string[];
	question: string;
	candidates?: unknown[];
}

/**
 * Groups unresolved requirements into as few questions as possible. The wording comes from the
 * requirement definitions; a model may rephrase a group later but never decides what is required.
 */
export function buildClarificationQuestions(
	issues: readonly RequirementIssue[],
): ClarificationQuestion[] {
	const groups = new Map<string, RequirementIssue[]>();
	for (const issue of issues) {
		const key = issue.field.startsWith('triggerParams.')
			? 'trigger'
			: issue.field.split('.').slice(0, 2).join('.');
		groups.set(key, [...(groups.get(key) ?? []), issue]);
	}
	return [...groups.values()].map((group) => {
		if (group.length === 1) {
			const [{ field, question, candidates }] = group;
			return { fields: [field], question, ...(candidates ? { candidates } : {}) };
		}
		const parts = group.map((issue) => issue.question.replace(/[?.]$/, ''));
		return {
			fields: group.map((issue) => issue.field),
			question: `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}?`,
		};
	});
}

/** Formats questions for a chat turn. */
export function formatClarification(questions: readonly ClarificationQuestion[]): string {
	if (questions.length === 1) return questions[0].question;
	return questions.map((question, index) => `${index + 1}. ${question.question}`).join('\n');
}
