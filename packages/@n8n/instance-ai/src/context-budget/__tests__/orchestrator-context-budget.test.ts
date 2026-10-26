import { renderSkillCatalogPrompt } from '@n8n/agents';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { mock } from 'vitest-mock-extended';

import { getVersionedSystemPrompt, resolvePromptProfile } from '../../prompts/prompt-profiles';
import { loadInstanceAiPromptSkills } from '../../skills/skills';
import { createOrchestrationTools, createOrchestratorDomainTools } from '../../tools';
import { ALWAYS_LOADED_TOOL_NAMES } from '../../tools/tool-ids';
import type { InstanceAiContext, OrchestrationContext } from '../../types';
import { formatContextBudget, measureContextBudget } from '../context-budget';

/**
 * Ceilings for the static context that the orchestrator sends on every model call.
 * Lower a ceiling when a change shrinks the context, so the saving cannot come back unseen.
 * Raise one only on purpose, and say why in the PR.
 */
const CEILINGS = {
	systemPrompt: 21_000,
	skillCatalog: 9_000,
	alwaysLoadedTools: 72_000,
	buildSkills: 135_000,
};

/** The skills that a typical workflow build loads and keeps for the rest of the thread. */
const BUILD_SKILLS = ['intent-recognition', 'workflow-builder', 'post-build-flow'];

async function measureDefaultProfile() {
	const { profile } = resolvePromptProfile({ version: 'default@1' });
	const systemPrompt = getVersionedSystemPrompt(profile.systemPromptVersion, {
		projectId: 'project-1',
		workspaceRoot: '/workspace',
		toolSearchEnabled: true,
		conversationHistoryEnabled: true,
		preferenceSavingEnabled: true,
		browserUseState: { status: 'disconnected' },
	});
	const { source } = await loadInstanceAiPromptSkills(profile);
	const skillCatalog = renderSkillCatalogPrompt(source.registry);
	const skills = await Promise.all(
		BUILD_SKILLS.map(async (id) => ({
			id,
			chars: (await source.loadSkill(id))?.instructions.length ?? 0,
		})),
	);

	// Deep mocks wire every optional service, so every gated tool is registered.
	const tools = [
		...createOrchestratorDomainTools(
			mock<InstanceAiContext>({ currentUserAttachments: [] }),
		).values(),
		...createOrchestrationTools(
			mock<OrchestrationContext>({ domainContext: { builderDelegate: undefined } }),
		).values(),
	].filter((tool) => ALWAYS_LOADED_TOOL_NAMES.has(tool.name));

	return measureContextBudget({ systemPrompt, skillCatalog, tools, skills });
}

describe('orchestrator context budget', () => {
	it('keeps the static context of the default profile under its ceilings', async () => {
		const budget = await measureDefaultProfile();
		const size = (name: string) => budget.sections.find((s) => s.name === name)?.chars ?? 0;

		const report = process.env.CONTEXT_BUDGET_OUT;
		if (report) {
			mkdirSync(dirname(report), { recursive: true });
			writeFileSync(report, formatContextBudget(budget));
		}

		expect(size('system prompt')).toBeLessThanOrEqual(CEILINGS.systemPrompt);
		expect(size('skill catalog')).toBeLessThanOrEqual(CEILINGS.skillCatalog);
		expect(size('tools')).toBeLessThanOrEqual(CEILINGS.alwaysLoadedTools);
		expect(size('loaded skills')).toBeLessThanOrEqual(CEILINGS.buildSkills);
	});
});
