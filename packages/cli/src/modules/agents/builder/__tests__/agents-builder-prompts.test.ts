import { SUB_AGENT_MAX_CHILDREN_MAX, SUB_AGENT_MAX_CHILDREN_MIN } from '@n8n/api-types';

import {
	INTERACTIVE_TOOLS_SECTION,
	READ_CONFIG_FRESHNESS_SECTION,
	WORKFLOW_SECTION,
	buildBuilderPrompt,
} from '../agents-builder-prompts';
import { getConfigMutationPrompt } from '../prompts/config-mutation.prompt';
import { getBuilderRuntimeSkills } from '../skills';

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

describe('Preview markdown link guidance', () => {
	const agentPreviewPath = '/projects/project-1/agents/agent-1/preview';

	it('embeds the Preview markdown link and requires it in successful-build wrap-ups', () => {
		const prompt = buildBuilderPrompt({
			agentPreviewPath,
			modelRecommendationsSection: null,
		});

		expect(prompt).toContain(`[Preview](${agentPreviewPath})`);
		expect(prompt).toContain('Keep the Preview link as a relative app path');
		expect(prompt).toContain(
			'After a successful build or config change that leaves the agent ready to try',
		);
		expect(prompt).toContain(
			`include the same [Preview](${agentPreviewPath}) markdown link in your wrap-up`,
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
	});

	it('references ask_questions in the batching guidance', () => {
		expect(WORKFLOW_SECTION).toContain('Clarify missing decisions through the Interactive tools');
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
