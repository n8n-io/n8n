import type { RepeatableWorkAssessment } from './repeatable-work';
import { isRepeatableEnough } from './repeatable-work';
import type { ScheduleTrigger } from './schedule-phrase';
import { describeScheduleTrigger, scheduleToCron } from './schedule-phrase';

export const REPEATABLE_WORK_OPEN_TAG = '<repeatable-work>';
export const REPEATABLE_WORK_CLOSE_TAG = '</repeatable-work>';

const INSTRUCTION =
	'When the workflow for this request works, load the make-automatic skill and offer to make it automatic once.';

/**
 * Matches a whole section as `buildRepeatableWorkSection` writes it, on lines of its own. Each
 * line is matched by its position, so a match attempt reads at most six lines and the time stays
 * linear on any text. The instruction line can be any text, so sections that an older wording
 * wrote still count.
 */
const SECTION_PATTERN =
	/(?:^|\n)<repeatable-work>\nscore: [^\n]*\nreasons: [^\n]*\n(?:suggested schedule: [^\n]*\n)?[^\n]*\n<\/repeatable-work>(?=\n|$)/;

/** The description starts with a capital letter, but it continues a sentence here. */
function lowerFirst(text: string): string {
	return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * A custom trigger carries its cron text as it was given, so only the generated kinds are used.
 * `parseSchedulePhrase` never returns a custom trigger.
 */
function scheduleLine(trigger: ScheduleTrigger | undefined): string[] {
	if (!trigger || trigger.mode === 'custom') return [];
	const description = lowerFirst(describeScheduleTrigger(trigger));
	return [`suggested schedule: ${description} (cron ${scheduleToCron(trigger)})`];
}

/**
 * The `<repeatable-work>` section of a turn's `<thread-context>`, or undefined below the
 * threshold. It holds only the score, the reason codes and a schedule that n8n generated from the
 * parsed trigger. It never holds the user's own text (for example the matched phrase), so that
 * user input cannot pose as guidance from n8n.
 */
export function buildRepeatableWorkSection(
	assessment: RepeatableWorkAssessment,
): string | undefined {
	if (!isRepeatableEnough(assessment)) return undefined;
	return [
		REPEATABLE_WORK_OPEN_TAG,
		`score: ${assessment.score}`,
		`reasons: ${assessment.reasons.join(', ')}`,
		...scheduleLine(assessment.suggestedTrigger?.trigger),
		INSTRUCTION,
		REPEATABLE_WORK_CLOSE_TAG,
	].join('\n');
}

/**
 * Whether the text has a section as `buildRepeatableWorkSection` writes it. Give it only the
 * blocks that n8n wrote (for example the leading `<thread-context>` of a stored message), so a
 * tag that the user types is not read as a section.
 */
export function hasRepeatableWorkSection(text: string): boolean {
	return SECTION_PATTERN.test(text);
}
