/**
 * Creation + listing agent-builder tools: create_skill, create_task,
 * build_custom_tool, list_integration_types, list_sub_agents, list_workflows.
 * Thin wrappers over `agentBuilderService`.
 */
import { Tool } from '@n8n/agents';
import { agentSkillSchema, agentTaskSchema } from '@n8n/api-types';
import { z } from 'zod';

import type { InstanceAiAgentBuilderService, InstanceAiContext } from '../../types';
import { AGENT_BUILDER_TOOL_IDS } from '../tool-ids';

interface CreationDeps {
	service: InstanceAiAgentBuilderService;
	agentId: string;
	projectId: string;
}

function resolveCreationDeps(context: InstanceAiContext): CreationDeps | null {
	if (!context.agentBuilderService || !context.agentBuilderTarget) return null;
	return {
		service: context.agentBuilderService,
		agentId: context.agentBuilderTarget.agentId,
		projectId: context.agentBuilderTarget.projectId,
	};
}

const NOT_CONFIGURED = {
	ok: false as const,
	errors: [
		{
			message:
				'No agent is being built yet. Call create_agent first to create one (or open an existing agent).',
		},
	],
};

function toError(e: unknown) {
	return { ok: false as const, errors: [{ message: e instanceof Error ? e.message : String(e) }] };
}

export function createCreateSkillTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.CREATE_SKILL)
		.description(
			'Create and store a reusable, load-on-demand target-agent skill (name + routing ' +
				'description + structured body). Does NOT attach the skill to the config — follow up with ' +
				'patch_config (or write_config) to add a `{ type: "skill", id }` entry to `skills`. ' +
				'Returns { ok: true, id, skill } or { ok: false, errors }.',
		)
		.systemInstruction(
			'Never create a vague or placeholder skill. The description is the routing contract; the body ' +
				'must be concrete and specific. If you lack the domain detail to write a genuinely useful ' +
				'skill, ask the user clarifying questions first.',
		)
		.input(
			z.object({
				name: agentSkillSchema.shape.name.describe('Human-readable skill name'),
				description: agentSkillSchema.shape.description.describe(
					'Routing contract: what the skill does + when to load it',
				),
				body: agentSkillSchema.shape.instructions.describe('Full skill body (structured Markdown)'),
			}),
		)
		.handler(async ({ name, description, body }) => {
			const deps = resolveCreationDeps(context);
			if (!deps) return NOT_CONFIGURED;
			try {
				const created = await deps.service.createSkill(deps.agentId, deps.projectId, {
					name,
					description,
					instructions: body,
				});
				return { ok: true as const, id: created.id, skill: created.skill };
			} catch (e) {
				return toError(e);
			}
		})
		.build();
}

export function createCreateTaskTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.CREATE_TASK)
		.description(
			'Create a recurring scheduled task for the target agent (name + objective + cron schedule). ' +
				'The objective is the exact message the agent receives on each run, so it must be precise ' +
				'and self-contained. Adds a `{ type: "task", id, enabled }` ref to the config; the task ' +
				'starts once the agent is (re)published. Returns { ok: true, task } or { ok: false, errors }.',
		)
		.systemInstruction(
			'Never create a task with a vague or placeholder objective. A task can only use tools the ' +
				'agent already has: if a step needs a tool/integration/web search the agent is missing, add ' +
				'it via patch_config/write_config BEFORE calling create_task.',
		)
		.input(
			z.object({
				name: agentTaskSchema.shape.name.describe('Short, human-readable task name'),
				objective: agentTaskSchema.shape.objective.describe('Exact, self-contained run message'),
				cronExpression: agentTaskSchema.shape.cronExpression.describe(
					'5-field cron expression, e.g. "0 9 * * 1-5" = weekdays at 09:00',
				),
			}),
		)
		.handler(async ({ name, objective, cronExpression }) => {
			const deps = resolveCreationDeps(context);
			if (!deps) return NOT_CONFIGURED;
			try {
				const task = await deps.service.createTask(deps.agentId, deps.projectId, {
					name,
					objective,
					cronExpression,
					enabled: true,
				});
				return { ok: true as const, task };
			} catch (e) {
				return toError(e);
			}
		})
		.build();
}

export function createBuildCustomToolTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.BUILD_CUSTOM_TOOL)
		.description(
			'Compile and store a custom tool. Pass the complete TypeScript source using ' +
				'`export default new Tool(...)`. The code is validated in a sandbox and saved against the ' +
				'agent. The returned `id` equals the tool name declared in the code. This does NOT register ' +
				'the tool in the config — follow up with patch_config to add `{ type: "custom", id }` to ' +
				'`tools`. Returns { ok: true, id, descriptor } or { ok: false, errors }.',
		)
		.input(
			z.object({
				code: z.string().describe('Complete TypeScript source using export default new Tool(...)'),
			}),
		)
		.handler(async ({ code }) => {
			const deps = resolveCreationDeps(context);
			if (!deps) return NOT_CONFIGURED;
			try {
				const descriptor = await deps.service.describeCustomTool(code);
				const built = await deps.service.buildCustomTool(
					deps.agentId,
					deps.projectId,
					code,
					descriptor,
				);
				return { ok: true as const, id: built.id, descriptor };
			} catch (e) {
				return toError(e);
			}
		})
		.build();
}

export function createListIntegrationTypesTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.LIST_INTEGRATION_TYPES)
		.description(
			"List integration types that can be added to the agent's `integrations` array. Returns each " +
				'chat platform with its supported `credentialTypes` and builder guidance (`capabilities`, ' +
				'`useIntegrationWhen`, `useNodeToolWhen`). Call BEFORE resolving a credential, then resolve ' +
				'a credential of ONE entry from `credentialTypes` (the credentials tool with action "list" ' +
				'+ the ask-user tool).',
		)
		.input(z.object({}))
		.handler(async () => {
			const deps = resolveCreationDeps(context);
			if (!deps) return { integrations: [] };
			return { integrations: await deps.service.listChatIntegrations() };
		})
		.build();
}

export function createListSubAgentsTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.LIST_SUB_AGENTS)
		.description(
			'List published agents in the same project that can be added to the target agent as ' +
				'sub-agents. Excludes the target agent itself and unpublished agents. The returned `agentId` ' +
				'values are the only valid values for `subAgents.agents[].agentId`.',
		)
		.input(z.object({}))
		.handler(async () => {
			const deps = resolveCreationDeps(context);
			if (!deps) return { agents: [] };
			return { agents: await deps.service.listProjectAgents(deps.projectId, deps.agentId) };
		})
		.build();
}

export function createListWorkflowsTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.LIST_WORKFLOWS)
		.description(
			'List the n8n workflows that can be attached as tools via `type: "workflow"` in the agent ' +
				'config. Workflows are the preferred way to give agents real capabilities (sending emails, ' +
				'creating calendar events, querying databases, calling APIs). Only returns workflows with ' +
				'supported trigger types.',
		)
		.input(z.object({}))
		.handler(async () => {
			if (!context.agentBuilderService) return { workflows: [] };
			const projectId = context.agentBuilderTarget?.projectId ?? context.projectId;
			return { workflows: await context.agentBuilderService.listAttachableWorkflows(projectId) };
		})
		.build();
}
