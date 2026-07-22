import { SUB_AGENT_MAX_CHILDREN_MAX, SUB_AGENT_MAX_CHILDREN_MIN } from '@n8n/api-types';

import {
	FEW_SHOT_FLOWS_SECTION,
	INTERACTIVE_TOOLS_SECTION,
	READ_CONFIG_FRESHNESS_SECTION,
	WORKFLOW_SECTION,
	buildBuilderPrompt,
} from '../agents-builder-prompts';
import { getConfigMutationPrompt } from '../prompts/config-mutation.prompt';
import { INITIAL_BUILD_NOTE, INITIAL_BUILD_SECTION } from '../prompts/initial-build.prompt';
import { getLlmSelectionPrompt } from '../prompts/llm-selection.prompt';
import { TOOLS_PROMPT } from '../prompts/tools.prompt';
import { getBuilderRuntimeSkills } from '../skills';

function normalizeWhitespace(value: string | undefined): string {
	return value?.replace(/\s+/g, ' ').trim() ?? '';
}

describe('builder prompt stability', () => {
	it('omits stale agent state while retaining config freshness guidance', () => {
		const prompt = buildBuilderPrompt({
			agentPreviewPath: '/projects/project-1/agents/agent-1/preview',
			modelRecommendationsSection: null,
		});

		expect(prompt).not.toContain('## Current Agent Config');
		expect(prompt).not.toContain('\n## Custom Tools\n');
		expect(prompt).not.toContain('## Builder runtime skills');
		expect(prompt).not.toContain('## Important');
		expect(prompt).toContain(
			'Always call `read_config` first whenever a request touches the config',
		);
	});
});

describe('create_skills / create_tasks batching guidance', () => {
	it('names only the plural batch tools, not the old singular ones', () => {
		const prompt = buildBuilderPrompt({
			agentPreviewPath: '/projects/project-1/agents/agent-1/preview',
			modelRecommendationsSection: null,
		});

		expect(prompt).toContain('`create_skills`');
		expect(prompt).toContain('`create_tasks`');
		expect(prompt).not.toContain('`create_skill`');
		expect(prompt).not.toContain('`create_task`');

		for (const skill of getBuilderRuntimeSkills()) {
			expect(skill.allowedTools ?? []).not.toContain('create_skill');
			expect(skill.allowedTools ?? []).not.toContain('create_task');
			expect(skill.instructions).not.toContain('`create_skill`');
			expect(skill.instructions).not.toContain('`create_task`');
		}
	});

	it('mandates one call per fully-specified batch, not one call per item', () => {
		const skills = getBuilderRuntimeSkills();
		const targetSkills = skills.find((skill) => skill.id === 'agent-builder-target-skills');
		const targetTasks = skills.find((skill) => skill.id === 'agent-builder-target-tasks');

		expect(targetSkills?.instructions).toContain(
			'do not spread multiple fully-specified skills\n  across separate calls',
		);
		expect(targetTasks?.instructions).toContain(
			'do not spread multiple fully-specified tasks\n  across separate calls',
		);
	});

	it('preserves the skill-attachment and task-publish rules for the batched tools', () => {
		const skills = getBuilderRuntimeSkills();
		const targetSkills = skills.find((skill) => skill.id === 'agent-builder-target-skills');
		const targetTasks = skills.find((skill) => skill.id === 'agent-builder-target-tasks');

		expect(targetSkills?.instructions).toContain(
			'Use `patch_config` or `write_config` to add a `{ "type": "skill", "id": "<returned id>" }`',
		);
		expect(targetTasks?.instructions).toContain(
			'`create_tasks` adds a `{ type: "task", id, enabled }` ref per task to',
		);
		expect(targetTasks?.instructions).toContain(
			'only start running once the agent is (re)published',
		);
	});

	it('permits create_skills and create_tasks together in one turn, never with an interactive tool or config mutation', () => {
		expect(WORKFLOW_SECTION).toContain(
			'call `create_skills`\n   and `create_tasks` in the same assistant response',
		);
		expect(WORKFLOW_SECTION).toContain(
			'Do not combine either\n   with an interactive tool or `write_config`/`patch_config` in that response.',
		);
	});
});

describe('compact tool output guidance', () => {
	it('requires a fresh read_config before retrying a stale write/patch', () => {
		expect(READ_CONFIG_FRESHNESS_SECTION).toContain(
			'`patch_config` returns `stage: "stale"`, call `read_config` and retry once\nusing the `config` and `configHash` it returns.',
		);

		const mutationPrompt = getConfigMutationPrompt();
		expect(mutationPrompt).toContain('Follow Config Freshness');
		expect(mutationPrompt).not.toContain('retry once using the');
	});

	it('never claims a stale or mutation-success response carries the config or configHash', () => {
		expect(READ_CONFIG_FRESHNESS_SECTION).toContain(
			'`read_config` is the only tool that returns the full `config`. A successful\n`write_config`/`patch_config` returns only `{ ok: true }` as confirmation\n— never the config, its hash, timestamps, or version — so it cannot serve as\na `baseConfigHash` for a later write.',
		);
		expect(READ_CONFIG_FRESHNESS_SECTION).not.toContain('configHash`, `updatedAt`');
		expect(READ_CONFIG_FRESHNESS_SECTION).not.toContain('retry once\nfrom the returned');

		const mutationPrompt = getConfigMutationPrompt();
		expect(mutationPrompt).not.toContain('never echo the config back');
		expect(mutationPrompt).not.toContain('retry once from the returned');
	});

	it('requires an immediately preceding read_config before every later mutation', () => {
		expect(READ_CONFIG_FRESHNESS_SECTION).toContain(
			'Call `read_config`\nagain immediately before every later mutation and before any later\ninspection of the config.',
		);
	});
});

describe('prompt-caching rule dedup', () => {
	it('states the detailed mandatory prompt-caching rule once, in Agent Config Rules', () => {
		const prompt = buildBuilderPrompt({
			agentPreviewPath: '/projects/project-1/agents/agent-1/preview',
			modelRecommendationsSection: null,
		});

		const detailedRule = 'this is mandatory and must\n  never be disabled';
		expect(prompt.split(detailedRule)).toHaveLength(2);

		const rulesIndex = prompt.indexOf('#### Agent Config Rules');
		const ruleIndex = prompt.indexOf(detailedRule);
		expect(rulesIndex).toBeGreaterThan(-1);
		expect(ruleIndex).toBeGreaterThan(rulesIndex);
	});
});

describe('agents builder integrations prompt', () => {
	it('does not tell the builder to prefer Slack OAuth credentials for chat integrations', () => {
		const integrationsSkill = getBuilderRuntimeSkills().find(
			(skill) => skill.id === 'agent-builder-integrations',
		);

		expect(integrationsSkill?.instructions).not.toContain('slackOAuth2Api');
		expect(integrationsSkill?.instructions).not.toContain('prefer the OAuth variant');
	});
});

describe('chat-channel credential guidance', () => {
	it('mandates configure_channel and forbids ask_credential for chat-channel credentials', () => {
		expect(INTERACTIVE_TOOLS_SECTION).toContain(
			'`ask_credential` for node-tool, MCP-server, and fallback web-search credentials',
		);
		expect(normalizeWhitespace(INTERACTIVE_TOOLS_SECTION)).toContain(
			"anything that isn't a node-tool credential, MCP-server credential, fallback web-search credential, or channel choice",
		);
		expect(INTERACTIVE_TOOLS_SECTION).toContain(
			'NEVER use it for a chat-channel\n  credential — use `configure_channel` instead.',
		);
		expect(INTERACTIVE_TOOLS_SECTION).toContain(
			'`configure_channel`: ALWAYS use this to connect a chat platform',
		);

		const integrationsSkill = getBuilderRuntimeSkills().find(
			(skill) => skill.id === 'agent-builder-integrations',
		);
		expect(integrationsSkill?.instructions).toContain(
			'ALWAYS use `configure_channel` for chat-channel\n  credentials — never `ask_credential`',
		);

		const llmSelectionPrompt = getLlmSelectionPrompt(null);
		expect(llmSelectionPrompt).toContain(
			'Use `ask_credential` for node tools, MCP servers, and fallback web-search credentials.',
		);
		expect(llmSelectionPrompt).not.toContain(
			'Use `ask_credential` for node tools and integrations.',
		);
	});

	it('references ask_questions in the batching guidance', () => {
		expect(WORKFLOW_SECTION).toContain('call `finish_setup` once');
		expect(INTERACTIVE_TOOLS_SECTION).toContain(
			'Batch every\n  question you currently need into a single call',
		);
	});

	it('tells the builder how to remove an existing chat integration', () => {
		const integrationsSkill = getBuilderRuntimeSkills().find(
			(skill) => skill.id === 'agent-builder-integrations',
		);

		expect(integrationsSkill?.recommendedTools).toContain('ask_questions');
		expect(integrationsSkill?.allowedTools).toContain('ask_questions');
		expect(integrationsSkill?.instructions).toContain('To remove an existing chat integration');
		expect(integrationsSkill?.instructions).toContain('config.integrations');
		expect(integrationsSkill?.instructions).toContain(
			'If multiple existing integrations match the requested platform, ask which one',
		);
		expect(integrationsSkill?.instructions).toContain(
			'Do not call `configure_channel` to remove a channel.',
		);
		expect(getConfigMutationPrompt()).toContain('#### Remove An Existing Chat Integration');
		expect(getConfigMutationPrompt()).toContain(
			'Omitting `integrations` preserves existing channels.',
		);
	});
});

describe('external integration routing guidance', () => {
	it('routes chat and trigger surfaces before resolving callable services', () => {
		const toolsPrompt = normalizeWhitespace(TOOLS_PROMPT);

		expect(toolsPrompt).toContain(
			"first decide whether it is the target agent's chat or trigger surface",
		);
		expect(toolsPrompt).toContain(
			'Do not call `resolve_integration` for chat/trigger integrations.',
		);
		expect(toolsPrompt).toContain(
			'For each requested non-chat callable service, call `resolve_integration` separately',
		);

		const slackFlow = normalizeWhitespace(
			FEW_SHOT_FLOWS_SECTION.split('### New agent: "Use Anthropic via OpenRouter"')[0],
		);
		expect(slackFlow).toContain('`list_integration_types()`');
		expect(slackFlow).toContain('`configure_channel({ integrationType: "slack" })`');
		expect(slackFlow).not.toContain('`resolve_integration`');
	});

	it('selects an MCP candidate before credential and verification', () => {
		const mcpSkill = getBuilderRuntimeSkills().find((skill) => skill.id === 'agent-builder-mcp');
		const mcpInstructions = normalizeWhitespace(mcpSkill?.instructions);

		expect(mcpInstructions).toContain(
			'`resolve_integration` returns `{ kind: "mcp", results: [...] }`',
		);
		expect(mcpInstructions).toContain('Never read server fields from the wrapper');
		expect(mcpInstructions).toContain('never choose by array order');
		expect(mcpInstructions).toContain('call `ask_questions` with the candidate');
		expect(mcpInstructions).toContain('`selectedResult.credentialType`');
		expect(mcpInstructions).toContain('returned `credentialId` as `credential`');
		expect(mcpInstructions).toContain(
			'If `ask_questions` returns `{ answered: false }`, stop MCP setup',
		);
		expect(mcpSkill?.recommendedTools).toContain('ask_questions');

		const notionFlow = normalizeWhitespace(
			FEW_SHOT_FLOWS_SECTION.split('### Add MCP integration:')[1]?.split(
				'### Ambiguous request:',
			)[0],
		);
		expect(notionFlow).toContain('select one entry from `results[]`');
		expect(notionFlow).toContain('`selectedResult.credentialType`');
		expect(notionFlow).toContain('`credentialId` as `credential`');
	});

	it('writes an MCP draft with the credential omitted during an initial build', () => {
		const mcpSkill = getBuilderRuntimeSkills().find((skill) => skill.id === 'agent-builder-mcp');
		const mcpInstructions = normalizeWhitespace(mcpSkill?.instructions);

		expect(mcpInstructions).toContain(INITIAL_BUILD_NOTE);
		expect(mcpInstructions).toContain('pick the best candidate by');
		expect(mcpInstructions).toContain('with `credential` omitted');
		expect(mcpInstructions).toContain('skip `verify_mcp_server`');
		expect(mcpInstructions).not.toContain('trailing batch');

		const notionFlow = normalizeWhitespace(
			FEW_SHOT_FLOWS_SECTION.split('### Add MCP integration:')[1]?.split(
				'### Ambiguous request:',
			)[0],
		);
		expect(notionFlow).toContain('pick the best candidate as a stated assumption');
		expect(notionFlow).not.toContain('trailing batch');
	});

	it('stops after channel setup and mutates config only for the non-chat branch', () => {
		const ambiguousFlow = normalizeWhitespace(
			FEW_SHOT_FLOWS_SECTION.split('### Ambiguous request:')[1]?.split(
				'### Publish after build:',
			)[0],
		);

		expect(ambiguousFlow).toContain('After `configure_channel` returns, stop this flow');
		expect(ambiguousFlow).toContain('In this non-chat branch only, `read_config()`');

		const chatBranch = ambiguousFlow.split('If it is a chat integration')[1]?.split('Otherwise')[0];
		expect(chatBranch).not.toContain('`read_config`');
		expect(chatBranch).not.toContain('`patch_config`');
		expect(chatBranch).not.toContain('`write_config`');
	});
});

describe('build-first workflow guidance', () => {
	it('guides the builder to plan with write_todos and blocked tasks', () => {
		expect(WORKFLOW_SECTION).toContain('`write_todos`');
		expect(WORKFLOW_SECTION).toContain('`blocked`');
		expect(WORKFLOW_SECTION).toContain('write the config with `model: ""`');
	});

	it('mandates write_todos for every build or change request, not just complex ones', () => {
		expect(WORKFLOW_SECTION).toContain('For every request that builds or changes the agent');
		expect(WORKFLOW_SECTION).toContain('per the Initial Build section');

		const prompt = buildBuilderPrompt({
			agentPreviewPath: '/p',
			modelRecommendationsSection: null,
		});
		expect(prompt).toContain('## Initial Build');
		expect(prompt).not.toContain('## Assumptions Over Questions');
		expect(prompt).toContain('fill gaps with sensible assumptions');

		const integrationsSkill = getBuilderRuntimeSkills().find(
			(skill) => skill.id === 'agent-builder-integrations',
		);
		expect(integrationsSkill?.instructions).toContain('"credentialId": ""');

		const mcpSkill = getBuilderRuntimeSkills().find((skill) => skill.id === 'agent-builder-mcp');
		expect(mcpSkill?.instructions).not.toContain('trailing batch');
	});

	it('tells the builder to announce auto-picked providers and free-credit claims', () => {
		expect(WORKFLOW_SECTION).toContain('auto-picked provider or newly provisioned free OpenAI');
		expect(getLlmSelectionPrompt(null)).toContain('claimedFreeOpenAiCredits');
		expect(getLlmSelectionPrompt(null)).toContain('autoPicked');
	});

	it('does not require a real model before the first config write', () => {
		const prompt = buildBuilderPrompt({
			agentPreviewPath: '/p',
			modelRecommendationsSection: null,
		});
		expect(prompt).not.toContain('Fresh agents need a real model');
	});

	it('guides silent resolve_llm and draft-first config mutation', () => {
		expect(getLlmSelectionPrompt(null)).toContain('call `resolve_llm` once, silently');
		expect(getConfigMutationPrompt()).toContain('#### Create A Fresh Agent Draft');
		expect(getConfigMutationPrompt()).not.toContain('Create Or Replace A Fresh Runnable Agent');
	});

	it('never suspends for setup during an initial build; defers to the closing checklist', () => {
		expect(INTERACTIVE_TOOLS_SECTION).toContain('During an initial build, never call it');
		expect(INTERACTIVE_TOOLS_SECTION).toContain(
			'"Initial build" means the first build pass on a fresh agent',
		);
		expect(INTERACTIVE_TOOLS_SECTION).toContain('Never suspend during an initial build');
		expect(INTERACTIVE_TOOLS_SECTION).not.toContain('trailing batch');
		expect(INTERACTIVE_TOOLS_SECTION).toContain('Channel connections are not\n  included');
		expect(getLlmSelectionPrompt(null)).toContain('leave the draft with `model: ""`');
		expect(getLlmSelectionPrompt(null)).toContain('never write `model: ""` over an existing model');
		expect(getLlmSelectionPrompt(null)).toContain('During an initial build, if `resolve_llm`');
		expect(getLlmSelectionPrompt(null)).not.toContain('trailing batch');
	});
});

describe('canonical initial-build section', () => {
	it('defines the full initial-build contract once', () => {
		expect(INITIAL_BUILD_SECTION).toContain('NEVER suspend mid-build on an interactive tool');
		expect(INITIAL_BUILD_SECTION).toContain('the single\n  trailing `finish_setup` call');
		expect(INITIAL_BUILD_SECTION).toContain('credentialId: ""');
		expect(INITIAL_BUILD_SECTION).toContain('a short setup checklist');
		expect(INITIAL_BUILD_SECTION).toContain('sensible assumptions');
	});

	it('exposes a shared one-line deferral note for skills to interpolate', () => {
		expect(INITIAL_BUILD_NOTE).toContain('never suspend mid-build');
		expect(INITIAL_BUILD_NOTE).toContain('defer pending setup to the end of the build');
	});

	it('has every deferring skill reference the note exactly once', () => {
		const skills = getBuilderRuntimeSkills();
		for (const id of [
			'agent-builder-integrations',
			'agent-builder-mcp',
			'agent-builder-node-tools',
			'agent-builder-resource-locators',
			'agent-builder-memory',
		]) {
			const skill = skills.find((s) => s.id === id);
			expect(skill?.instructions).toContain(INITIAL_BUILD_NOTE);
		}
	});
});

describe('MCP skill availability', () => {
	it('includes the MCP skill', () => {
		const skills = getBuilderRuntimeSkills();
		expect(skills.find((s) => s.id === 'agent-builder-mcp')).toBeDefined();
	});
});

describe('resource locator skill availability', () => {
	it('includes builder guidance for node dynamic selectors', () => {
		const skills = getBuilderRuntimeSkills();
		const skill = skills.find((s) => s.id === 'agent-builder-resource-locators');

		expect(skill).toBeDefined();
		expect(skill?.description).toContain('write_config/patch_config rejects $fromAI');
		expect(skill?.instructions).toContain('Linear `teamId`');
		expect(skill?.instructions).toContain('get_resource_locator_options');
		expect(skill?.instructions).toContain('parameterValue');
	});
});

describe('sub-agent skill availability', () => {
	it('contains the moved sub-agent delegation guidance', () => {
		const skill = getBuilderRuntimeSkills().find((s) => s.id === 'agent-builder-sub-agents');

		expect(skill).toBeDefined();
		expect(skill?.instructions).toContain('`delegate_subagent`');
		expect(skill?.instructions).toContain('Call `list_sub_agents`');
		expect(skill?.instructions).toContain('`type: "multi"`');
		expect(skill?.instructions).toContain('subAgentId: "inline"');
		expect(skill?.instructions).toContain('`subAgents.maxChildren`');
		expect(skill?.instructions).toContain(
			'{ "agentId": "<returned-agent-id>", "useWhen": "Use for ..." }',
		);
		expect(skill?.instructions).toContain(
			'If it is unclear when a selected saved subagent should be used, ask the user',
		);
		expect(skill?.instructions).toContain('Do not write vague values');
		expect(skill?.instructions).toContain(
			`from ${SUB_AGENT_MAX_CHILDREN_MIN} to ${SUB_AGENT_MAX_CHILDREN_MAX}`,
		);
	});
});
