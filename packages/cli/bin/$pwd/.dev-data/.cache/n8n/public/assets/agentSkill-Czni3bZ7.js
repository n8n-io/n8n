import { Mw as ResponseError } from "./app-D5flEmb-.js";
//#region src/features/agents/utils/agentSkill.ts
/** Whether a save failed because the skill's scope already has a name like it. */
function isSkillNameTakenError(error) {
	return error instanceof ResponseError && error.httpStatusCode === 409 && error.message === "That name is taken, choose another";
}
/** Skills drop `allowedTools`: the editor does not show it and the runtime does not get it. */
function normalizeAgentSkillForSave(skill) {
	const { allowedTools: _allowedTools, ...rest } = skill;
	return rest;
}
/**
* The agents that lose a skill when it moves to `target`, by the rule the backend applies:
* an agent can add an instance skill and a skill of its own project.
* The caller does not know the projects of hidden agents, so they lose it unless the
* target is the instance. Every built-in role that can create skills in a project can
* also read its agents, so a hidden agent is never in a project the user can pick.
* `keepAgentId` is the agent that asks for the move.
*/
function agentsLosingSkill(usage, target, keepAgentId) {
	if (target.projectId === null) return {
		names: [],
		hidden: 0
	};
	const names = /* @__PURE__ */ new Map();
	for (const agent of [...usage.drafts, ...usage.pins]) {
		if (agent.agentId === keepAgentId) continue;
		if (agent.projectId !== target.projectId) names.set(agent.agentId, agent.agentName);
	}
	return {
		names: [...names.values()],
		hidden: usage.hiddenAgents
	};
}
//#endregion
export { isSkillNameTakenError as n, normalizeAgentSkillForSave as r, agentsLosingSkill as t };
