import { SKILL_NAME_TAKEN_MESSAGE } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';

import type { AgentSkill } from '../types';

/** Whether a save failed because the skill's scope already has a name like it. */
export function isSkillNameTakenError(error: unknown): boolean {
	return (
		error instanceof ResponseError &&
		error.httpStatusCode === 409 &&
		error.message === SKILL_NAME_TAKEN_MESSAGE
	);
}

/** Skills drop `allowedTools`: the editor does not show it and the runtime does not get it. */
export function normalizeAgentSkillForSave(skill: AgentSkill): AgentSkill {
	const { allowedTools: _allowedTools, ...rest } = skill;
	return rest;
}
