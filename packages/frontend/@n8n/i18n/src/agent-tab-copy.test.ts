import { describe, expect, it } from 'vitest';

import en from './locales/en.json';

// AGENT-1384: Descriptions across the Agent tabs must not end with a full stop.
const descriptionsByTab: Record<string, Array<keyof typeof en>> = {
	Build: [
		'agents.builder.agent.description',
		'agents.builder.agent.model.description',
		'agents.builder.agent.instructions.description',
		'agents.builder.skills.description',
		'agents.builder.triggers.description',
		'agents.builder.capabilities.description',
		'agents.builder.advanced.webSearch.hint',
		'agents.builder.advanced.webSearch.maxUses.hint',
		'agents.builder.advanced.webSearch.externalAccess.hint',
		'agents.builder.advanced.webSearch.contextSize.hint',
		'agents.builder.advanced.webSearch.credential.hint',
		'agents.builder.memory.description',
		'agents.builder.memory.episodicMemory.hint',
	],
	Knowledge: [
		'agents.builder.files.titleTooltip',
		'agents.builder.files.description',
		'agents.builder.files.emptyDescription',
		'agents.builder.vectorStores.panel.titleTooltip',
		'agents.builder.vectorStores.panel.empty.description',
	],
	Sessions: ['agentSessions.emptyDescription'],
	Settings: [
		'agents.builder.budget.usage.estimate',
		'agents.builder.budget.monthly.hint',
		'agents.builder.budget.session.hint',
		'agents.builder.subAgents.settings.description',
		'agents.builder.subAgents.maxChildren.hint',
		'agents.builder.subAgents.customModelRouting.hint',
		'agents.builder.subAgents.modelsByDifficulty.low.description',
		'agents.builder.subAgents.modelsByDifficulty.medium.description',
		'agents.builder.subAgents.modelsByDifficulty.high.description',
		'agents.builder.mcp.availableInMCP.hint',
		'agents.builder.advanced.description',
		'agents.builder.memory.recallModel.hint',
		'agents.builder.advanced.reasoning.hint',
		'agents.builder.advanced.reasoning.unsupportedHint',
		'agents.builder.advanced.reasoning.noModelHint',
		'agents.builder.advanced.promptCaching.hint',
		'agents.builder.advanced.concurrency.hint',
		'agents.builder.advanced.maxIterations.hint',
	],
	Evals: [
		'agents.builder.agentEvals.empty.description',
		'agents.builder.agentEvals.empty.preview.description',
		'agents.builder.agentEvals.cases.description',
		'agents.builder.agentEvals.external.description',
		'agents.builder.agentEvals.review.noRuns.description',
	],
};

describe.each(Object.entries(descriptionsByTab))('%s tab descriptions', (_tab, keys) => {
	it.each(keys)('%s has no trailing full stop', (key) => {
		expect(en[key]).not.toBe('');
		expect(en[key]).not.toMatch(/\.\s*$/);
	});
});
