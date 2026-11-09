import { z } from 'zod';

// Cloud stores Typeform answers by form ID and question ref.
const AI_TOOLS_FIELD_BY_SURVEY = new Map([
	['OArzTwNz', '6fe33101-6331-4088-b54f-ae4afe727f96'],
	['x0RS6StY', 'do_you_use_agents'],
]);

const informationSchema = z.record(z.unknown());
const choicesSchema = z.array(z.string());

export function pickedClaudeInOnboarding(information: unknown): boolean | undefined {
	const parsed = informationSchema.safeParse(information);
	if (!parsed.success) return undefined;
	// Retry unavailable data, but do not wait for a different answer to a saved survey.
	if (typeof parsed.data.surveyId !== 'string') return false;
	const field = AI_TOOLS_FIELD_BY_SURVEY.get(parsed.data.surveyId);
	if (!field) return false;
	const answer = choicesSchema.safeParse(parsed.data[field]);
	return answer.success && answer.data.includes('Claude (incl. Claude Code)');
}
