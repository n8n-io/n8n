import { tool } from '@langchain/core/tools';
import { interrupt } from '@langchain/langgraph';
import { z } from 'zod';

const plannerQuestionSchema = z.object({
	id: z.string(),
	question: z.string(),
	type: z.enum(['single', 'multi', 'text']),
	options: z.array(z.string()).optional(),
});

const submitQuestionsInputSchema = z.object({
	introMessage: z.string().optional().describe('Brief context for why asking'),
	questions: z.array(plannerQuestionSchema).min(1).max(5),
});

const questionResponseSchema = z.object({
	questionId: z.string(),
	question: z.string(),
	selectedOptions: z.array(z.string()),
	customText: z.string().optional(),
	skipped: z.boolean().optional(),
});

const answersArraySchema = z.array(questionResponseSchema);
const answersRecordSchema = z.record(z.union([z.string(), z.array(z.string())]));

type PlannerQuestionInput = z.infer<typeof plannerQuestionSchema>;
type SubmitQuestionsInput = z.infer<typeof submitQuestionsInputSchema>;

export function formatAnswersForDiscovery(
	questions: PlannerQuestionInput[],
	resumeValue: unknown,
): string {
	const parsedArray = answersArraySchema.safeParse(resumeValue);
	if (parsedArray.success) {
		const lines = parsedArray.data
			.filter((a) => !a.skipped)
			.map((a) => {
				const selected = a.selectedOptions.join(', ').trim();
				const custom = a.customText?.trim();

				const parts = [selected, custom].filter(
					(part): part is string => typeof part === 'string' && part.length > 0,
				);
				const answerText = parts.length > 0 ? parts.join(', ') : '(no answer)';
				return `- ${a.question}: ${answerText}`;
			});

		return `User provided these clarifications:\n${lines.join('\n')}\n\nProceed with node discovery based on this information.`;
	}

	const parsedRecord = answersRecordSchema.safeParse(resumeValue);
	if (parsedRecord.success) {
		const lines = questions
			.map((q) => {
				const answer = parsedRecord.data[q.id];
				if (!answer) return null;
				const answerText = Array.isArray(answer) ? answer.join(', ') : answer;
				return `- ${q.question}: ${answerText}`;
			})
			.filter((line): line is string => typeof line === 'string');

		return `User provided these clarifications:\n${lines.join('\n')}\n\nProceed with node discovery based on this information.`;
	}

	return 'User responded, but the answer payload could not be parsed. Ask the questions again with simpler options.';
}

export const submitQuestionsTool = tool(
	async (input: SubmitQuestionsInput) => {
		const resumeValue: unknown = interrupt({
			type: 'questions',
			introMessage: input.introMessage,
			questions: input.questions,
		});

		return formatAnswersForDiscovery(input.questions, resumeValue);
	},
	{
		name: 'submit_questions',
		description: `Ask clarifying questions before proceeding with node discovery. Use when:
- The request is ambiguous or has multiple interpretations
- Key information is missing (which service, what goal, what trigger, etc.)
- You would need to make assumptions the user might disagree with

Maximum 5 questions. Provide options where possible.
IMPORTANT: Never include "Other" as an option — the UI automatically adds an "Other" free-text input to every question. Only include specific, meaningful options.`,
		schema: submitQuestionsInputSchema,
	},
);
