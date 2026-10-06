import type {
	InstanceAiEnsureThreadResponse,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	loadInstanceAiRuntimeSkillSource,
} from '@n8n/instance-ai';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { UnexpectedError } from 'n8n-workflow';
import { z } from 'zod';

import { BadRequestError } from '@n8n/errors';
import { Telemetry } from '@/telemetry';

import {
	InstanceAiMemoryService,
	type InstanceAiThreadLaunchMetadata,
} from './instance-ai-memory.service';
import { ONBOARDING_OPENING } from './onboarding-opening';

/** Thread metadata key for the unanswered onboarding card. */
export const ONBOARDING_CARD_METADATA_KEY = 'onboardingCard';

/** Folder id under `@n8n/instance-ai/skills` of the skill preloaded on onboarding threads. */
export const ONBOARDING_SKILL_ID = 'suggest-automations';

/**
 * Marks the host-seeded card's confirmation request so the confirm endpoint can tell it from a
 * card that has a run behind it. Fits the 36-char `requestId` column together with a nanoid.
 */
/** Start of the `${N8N_*}` placeholders the sandbox materializer substitutes; split so the lint rule for interpolation does not fire. */
const PRELOAD_FORBIDDEN_PLACEHOLDER_PREFIX = '$' + '{N8N_';
/** One answer in the `ask-user` result shape: the wire answer plus the question text. */

/**
 * The n8n Cloud signup survey answers the launch context may carry under `survey`, keyed like
 * the cloud stores them in the account `information` (`GET /rest/cloud/proxy/user/me`). Other
 * keys are dropped. The card skips a step the survey answers; the answer still reaches the agent.
 */
const surveySchema = z.object({ what_team_are_you_on: z.string().max(100).optional() });
type Survey = z.infer<typeof surveySchema>;
/** Where the survey came from: the n8n Cloud account, or the `?team=` query of a test run. */
const surveySourceSchema = z.enum(['cloud', 'url']);
type SurveySource = z.infer<typeof surveySourceSchema> | null;
const launchContextSchema = z.object({
	survey: surveySchema.optional(),
	surveySource: surveySourceSchema.optional(),
});
function surveyOf(sourceContext: unknown): { survey: Survey; surveySource: SurveySource } {
	const parsed = launchContextSchema.safeParse(sourceContext ?? {});
	if (!parsed.success) throw new BadRequestError('Invalid onboarding survey in sourceContext');
	return { survey: parsed.data.survey ?? {}, surveySource: parsed.data.surveySource ?? null };
}

/**
 * Split the opening into the steps the card shows and the answers the survey already gave. A
 * shown step that picks its options from a survey-answered step gets them resolved here: the
 * card resolves `optionsByAnswer` only from its own steps. `{{team}}` in a question text becomes
 * the survey's team. A value outside the step's options (the survey's "Other") names no team:
 * texts drop it and dependents keep their fallback options.
 */
/** "Gmail", "Gmail and Slack", or "Gmail, Slack, and your other tools" for the follow-up text. */
/**
 * Body of the preloaded skill, sent with the opening turn as is. The sandbox materializer
 * substitutes `${N8N_*}` placeholders only in the skills it writes to the workspace, so a
 * placeholder here would reach the shell as an unset variable.
 */
export async function loadOnboardingSkill(): Promise<string> {
	const skill = await loadInstanceAiRuntimeSkillSource().loadSkill(ONBOARDING_SKILL_ID);
	if (!skill) throw new UnexpectedError(`Runtime skill "${ONBOARDING_SKILL_ID}" not found`);
	if (skill.instructions.includes(PRELOAD_FORBIDDEN_PLACEHOLDER_PREFIX)) {
		throw new UnexpectedError(
			`Runtime skill "${ONBOARDING_SKILL_ID}" is preloaded and must not use \${N8N_*} placeholders`,
		);
	}
	return skill.instructions;
}

/**
 * The agent-first onboarding thread. The greeting and one question card are stored before the
 * agent's first turn, the card as a finished synthetic run whose `ask-user` call still waits
 * for an answer. The UI shows, answers and restores the card through the same HITL path as a
 * live one. The answer settles the card and posts the follow-up question the same way, with no
 * model turn; the task the user types next starts the first real turn. Free text in the card
 * starts that turn at once instead, with the answers as the message.
 */
@Service()
export class InstanceAiOnboardingService {
	constructor(
		private readonly memoryService: InstanceAiMemoryService,
		private readonly telemetry: Telemetry,
	) {}

	async ensureThread(
		user: User,
		threadId: string,
		projectId: string,
		launchMetadata: InstanceAiThreadLaunchMetadata,
	): Promise<InstanceAiEnsureThreadResponse> {
		// Read the survey before the thread exists, so a bad survey creates nothing.
		// The opening greeting and question card were a synthetic run in the legacy
		// event log; on the Agents runtime the onboarding skill rides the first turn.
		const { survey, surveySource } = surveyOf(launchMetadata.sourceContext);
		const response = await this.memoryService.ensureThread(
			user.id,
			threadId,
			projectId,
			launchMetadata,
			ONBOARDING_OPENING.title,
		);
		if (!response.created) return response;

		const team = survey.what_team_are_you_on?.trim() || null;
		this.telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_STARTED_AI_ASSISTANT_ONBOARDING, {
			user_id: user.id,
			thread_id: threadId,
			team,
			team_source: team ? surveySource : null,
		});
		return response;
	}

}
