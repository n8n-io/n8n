import type { AgentJsonConfig } from '@n8n/api-types';
import { AGENT_MODEL_STRING_REGEX } from '@n8n/api-types';

import type {
	DecisionLogEntry,
	DecisionService,
} from '../../workflow-compiler/decision/decision-service';
import { resolveChoice } from '../../workflow-compiler/decision/policy';
import { withNoneOfThese, type DecisionQuestions } from '../../workflow-compiler/decision/schemas';
import { planActions } from '../../workflow-compiler/modes/plan-actions';
import { detectScheduleCron } from '../../workflow-compiler/requirements/extract';
import type { RequirementIssue } from '../../workflow-compiler/requirements/types';
import { findByName, type AgentCapabilityCatalog } from '../catalog/capabilities';
import { compileAgent } from '../compiler/compile';
import type { AgentToolIR } from '../ir/schema';
import { detectChannels, extractAgentRequirements } from '../requirements/extract';
import { AGENT_DECISION_SCHEMA_VERSION } from '../versions';

/** Minimal edits applied to an existing agent config. Untouched fields carry over. */
export type AgentPatch =
	| { op: 'rename'; name: string }
	| { op: 'add_tool'; tool: NonNullable<AgentJsonConfig['tools']>[number] }
	| { op: 'remove_tool'; toolName: string }
	| { op: 'set_channel'; integration: NonNullable<AgentJsonConfig['integrations']>[number] }
	| { op: 'remove_channel'; type: string }
	| { op: 'set_model'; model: string; credential?: string }
	| { op: 'set_memory'; observational: boolean; episodic: boolean }
	| { op: 'set_web_search'; enabled: boolean }
	| { op: 'append_rule'; rule: string }
	| { op: 'replace_instructions'; instructions: string }
	| { op: 'add_sub_agent'; agentId: string; useWhen?: string }
	| { op: 'remove_sub_agent'; agentId: string }
	| { op: 'set_approval'; toolName: string; requireApproval: boolean }
	| {
			op: 'add_task';
			task: {
				name: string;
				objective: string;
				cronExpression: string;
				timezone: string;
				enabled: boolean;
			};
	  };

export type EditKind =
	| 'rename'
	| 'add_tool'
	| 'remove_tool'
	| 'set_channel'
	| 'remove_channel'
	| 'set_model'
	| 'set_memory'
	| 'set_web_search'
	| 'add_rule'
	| 'replace_instructions'
	| 'add_sub_agent'
	| 'remove_sub_agent'
	| 'set_approval'
	| 'add_task';

const KIND_CUES: Array<{ kind: EditKind; pattern: RegExp }> = [
	{ kind: 'rename', pattern: /\brename\b|\bcall (it|the agent)\b/i },
	{
		kind: 'remove_channel',
		pattern: /\b(remove|disconnect|drop|stop using)\b.*\b(slack|telegram|discord|linear)\b/i,
	},
	{
		kind: 'set_channel',
		pattern:
			/\b(connect|add|enable|put it on|make it available (on|in)|deploy to)\b.*\b(slack|telegram|discord|linear)\b|\b(slack|telegram|discord|linear)\b.*\b(channel|integration)\b/i,
	},
	{
		kind: 'set_model',
		pattern:
			/\b(model|switch to|use)\b.*\b(claude|gpt|gemini|anthropic|openai|google|mistral|grok|xai|groq|deepseek|bedrock|azure|openrouter|[a-z0-9-]+\/[a-z0-9._:-]+)\b/i,
	},
	{ kind: 'set_memory', pattern: /\b(memory|remember|forget)\b/i },
	{ kind: 'set_web_search', pattern: /\b(web search|search the web|browse)\b/i },
	{
		kind: 'remove_sub_agent',
		pattern: /\b(remove|detach|stop delegating)\b.*\b(sub-?agent|agent)\b/i,
	},
	{ kind: 'add_sub_agent', pattern: /\b(delegate|hand off|sub-?agent)\b/i },
	{
		kind: 'set_approval',
		pattern: /\b(approval|ask (me )?(before|first)|confirm (before|first)|without asking)\b/i,
	},
	{
		kind: 'add_task',
		pattern: /\b(every|daily|nightly|hourly|weekly|schedule|each (day|week|morning))\b/i,
	},
	{
		kind: 'remove_tool',
		pattern:
			/\b(remove|delete|drop|take away)\b.*\b(tool|ability|capability)\b|\b(remove|delete|drop)\b/i,
	},
	{
		kind: 'replace_instructions',
		pattern: /\b(rewrite|replace) (the |its )?(instructions|system prompt|prompt)\b/i,
	},
	{
		kind: 'add_rule',
		pattern: /\b(never|always|do not|don't|must|should|only|tell it to|make it|be more|be less)\b/i,
	},
	{ kind: 'add_tool', pattern: /\b(add|give|let it|allow it to|able to|also)\b/i },
];

export interface AgentEditPlanInput {
	request: string;
	config: AgentJsonConfig;
	catalog: AgentCapabilityCatalog;
	decisions: DecisionService;
	answers?: Record<string, unknown>;
	sessionWorkflows?: Array<{ id: string; name: string; description?: string }>;
	abortSignal?: AbortSignal;
}

export type AgentEditPlanResult =
	| { status: 'needs_clarification'; issues: RequirementIssue[]; log: DecisionLogEntry[] }
	| {
			status: 'planned';
			patches: AgentPatch[];
			summary: string;
			log: DecisionLogEntry[];
			waves: number;
	  };

export function detectEditKind(text: string): EditKind | undefined {
	return KIND_CUES.find(({ pattern }) => pattern.test(text))?.kind;
}

function toolNameOf(tool: NonNullable<AgentJsonConfig['tools']>[number]): string {
	return tool.type === 'custom'
		? tool.id
		: (tool.name ?? (tool.type === 'workflow' ? tool.workflow : ''));
}

/** Applies patches to a copy of the config. Throws on a patch that names a missing item. */
export function applyAgentPatches(
	config: AgentJsonConfig,
	patches: readonly AgentPatch[],
): { config: AgentJsonConfig; tasks: Array<Extract<AgentPatch, { op: 'add_task' }>['task']> } {
	const result: AgentJsonConfig = structuredClone(config);
	const tasks: Array<Extract<AgentPatch, { op: 'add_task' }>['task']> = [];
	for (const patch of patches) {
		switch (patch.op) {
			case 'rename':
				result.name = patch.name;
				break;
			case 'add_tool':
				result.tools = [...(result.tools ?? []), patch.tool];
				break;
			case 'remove_tool': {
				const before = result.tools?.length ?? 0;
				result.tools = (result.tools ?? []).filter((tool) => toolNameOf(tool) !== patch.toolName);
				if (result.tools.length === before)
					throw new Error(`Tool "${patch.toolName}" does not exist on the agent.`);
				break;
			}
			case 'set_channel':
				result.integrations = [
					...(result.integrations ?? []).filter(
						(integration) => integration.type !== patch.integration.type,
					),
					patch.integration,
				];
				break;
			case 'remove_channel':
				result.integrations = (result.integrations ?? []).filter(
					(integration) => integration.type !== patch.type,
				);
				break;
			case 'set_model':
				result.model = patch.model;
				if (patch.credential) result.credential = patch.credential;
				break;
			case 'set_memory':
				result.memory = {
					enabled: patch.observational || patch.episodic,
					storage: 'n8n',
					observationalMemory: { enabled: patch.observational },
					episodicMemory: patch.episodic
						? { enabled: true, credential: 'managed' }
						: { enabled: false },
				};
				break;
			case 'set_web_search':
				result.config = { ...(result.config ?? {}), webSearch: { enabled: patch.enabled } };
				break;
			case 'append_rule':
				result.instructions = appendRule(result.instructions, patch.rule);
				break;
			case 'replace_instructions':
				result.instructions = patch.instructions;
				break;
			case 'add_sub_agent': {
				const agents = (result.subAgents?.agents ?? []).filter(
					(agent) => agent.agentId !== patch.agentId,
				);
				result.subAgents = {
					...(result.subAgents ?? {}),
					agents: [
						...agents,
						{ agentId: patch.agentId, ...(patch.useWhen ? { useWhen: patch.useWhen } : {}) },
					],
				};
				break;
			}
			case 'remove_sub_agent':
				result.subAgents = {
					...(result.subAgents ?? {}),
					agents: (result.subAgents?.agents ?? []).filter(
						(agent) => agent.agentId !== patch.agentId,
					),
				};
				break;
			case 'set_approval': {
				const tool = (result.tools ?? []).find(
					(candidate) => toolNameOf(candidate) === patch.toolName,
				);
				if (!tool) throw new Error(`Tool "${patch.toolName}" does not exist on the agent.`);
				tool.requireApproval = patch.requireApproval;
				break;
			}
			case 'add_task':
				tasks.push(patch.task);
				break;
		}
	}
	return { config: result, tasks };
}

function appendRule(instructions: string, rule: string): string {
	const line = `- ${rule.replace(/^[-*]\s*/, '')}`;
	if (/^## Rules$/m.test(instructions)) {
		return instructions.replace(
			/(^## Rules\n(?:- .*\n?)*)/m,
			(block) => `${block.trimEnd()}\n${line}\n`,
		);
	}
	return `${instructions.trimEnd()}\n\n## Rules\n${line}\n`;
}

/**
 * Edit mode: classify the change, resolve the target with a bounded decision
 * only when the text is ambiguous, and emit a minimal patch set.
 */
export async function planAgentEdit(input: AgentEditPlanInput): Promise<AgentEditPlanResult> {
	const log: DecisionLogEntry[] = [];
	const kind = detectEditKind(input.request);
	const tools = input.config.tools ?? [];
	const toolNames = tools.map(toolNameOf);
	const ask = (
		field: string,
		reason: string,
		question: string,
		candidates?: unknown[],
	): AgentEditPlanResult => ({
		status: 'needs_clarification',
		log,
		issues: [{ field, reason, question, ...(candidates ? { candidates } : {}) }],
	});

	if (!kind)
		return ask(
			'edit.kind',
			'The requested change is not recognized.',
			'Should I add or remove a tool, connect or remove a channel, change the model, memory, rules, or schedule, or rename the agent?',
		);

	switch (kind) {
		case 'rename': {
			const name = input.request.match(/\b(?:to|called|named)\s+["“]?([^"”]+?)["”]?\s*$/i)?.[1];
			if (!name) return ask('edit.name', 'No new name given.', 'What should the agent be called?');
			return {
				status: 'planned',
				patches: [{ op: 'rename', name }],
				summary: `Renamed the agent to "${name}".`,
				log,
				waves: 0,
			};
		}
		case 'set_channel':
		case 'remove_channel': {
			const mention = detectChannels(input.request)[0];
			if (!mention)
				return ask(
					'edit.channel',
					'No channel named.',
					`Which channel: ${input.catalog.channels.map((channel) => channel.label).join(', ')}?`,
				);
			if (!mention.supported || !mention.type)
				return ask(
					`channels.${mention.name}`,
					`${mention.name} is not supported.`,
					`Agents cannot connect to ${mention.name} here. Supported channels: ${input.catalog.channels.map((channel) => channel.label).join(', ')}.`,
				);
			if (kind === 'remove_channel')
				return {
					status: 'planned',
					patches: [{ op: 'remove_channel', type: mention.type }],
					summary: `Removed the ${mention.type} channel.`,
					log,
					waves: 0,
				};
			const existing = (input.config.integrations ?? []).find(
				(integration) => integration.type === mention.type,
			);
			const credentialId =
				typeof input.answers?.credentialId === 'string'
					? input.answers.credentialId
					: (existing?.credentialId ?? '');
			const integration = compileAgent(
				{
					ref: 'x',
					name: 'x',
					purpose: 'x',
					instructions: { role: 'x', goals: [], rules: [] },
					channels: [{ type: mention.type, ...(credentialId ? { credentialId } : {}) }],
					model: { mode: 'default' },
					tools: [],
					skills: [],
					tasks: [],
					subAgents: [],
					memory: { observational: false, episodic: false },
					mcpServers: [],
					options: {},
					patternIds: [],
				},
				{ registry: input.catalog.nodeRegistry, defaultModel: null },
			).config.integrations?.[0];
			if (!integration)
				return ask(
					'edit.channel',
					'Channel could not be compiled.',
					'Which channel should the agent use?',
				);
			return {
				status: 'planned',
				patches: [{ op: 'set_channel', integration }],
				summary: `Connected the ${mention.type} channel${credentialId ? '' : ' (credential still needed)'}.`,
				log,
				waves: 0,
			};
		}
		case 'set_model': {
			const explicit = input.request.match(
				/\b([a-z0-9-]+\/[a-z0-9._:-]+(?:\/[a-z0-9._:-]+)*)\b/i,
			)?.[1];
			if (explicit && AGENT_MODEL_STRING_REGEX.test(explicit)) {
				return {
					status: 'planned',
					patches: [
						{
							op: 'set_model',
							model: explicit.toLowerCase(),
							...(typeof input.answers?.credentialId === 'string'
								? { credential: input.answers.credentialId }
								: {}),
						},
					],
					summary: `Set the model to ${explicit.toLowerCase()}.`,
					log,
					waves: 0,
				};
			}
			const provider = extractAgentRequirements(input.request).modelProvider;
			const fallback = input.catalog.defaultModel;
			if (provider && fallback?.model.startsWith(`${provider}/`)) {
				return {
					status: 'planned',
					patches: [{ op: 'set_model', model: fallback.model, credential: fallback.credential }],
					summary: `Set the model to ${fallback.model}.`,
					log,
					waves: 0,
				};
			}
			return ask(
				'edit.model',
				'The exact model is not known.',
				`Which model, as "provider/model-name" (for example anthropic/claude-sonnet-4-5)${provider ? ` from ${provider}` : ''}?`,
			);
		}
		case 'set_memory': {
			const off = /\b(disable|turn off|forget|no memory|remove memory)\b/i.test(input.request);
			const episodic = /\b(episodic|facts|preferences)\b/i.test(input.request);
			return {
				status: 'planned',
				patches: [{ op: 'set_memory', observational: !off, episodic: !off && episodic }],
				summary: off
					? 'Disabled memory.'
					: `Enabled ${episodic ? 'observational and episodic' : 'observational'} memory.`,
				log,
				waves: 0,
			};
		}
		case 'set_web_search': {
			const off = /\b(disable|turn off|remove|no)\b/i.test(input.request);
			return {
				status: 'planned',
				patches: [{ op: 'set_web_search', enabled: !off }],
				summary: `${off ? 'Disabled' : 'Enabled'} web search.`,
				log,
				waves: 0,
			};
		}
		case 'add_rule':
			return {
				status: 'planned',
				patches: [{ op: 'append_rule', rule: input.request.trim().replace(/[.]$/, '') }],
				summary: 'Added a rule to the instructions.',
				log,
				waves: 0,
			};
		case 'replace_instructions': {
			const quoted = input.request.match(/["“]([^"”]{10,})["”]/)?.[1];
			if (!quoted)
				return ask(
					'edit.instructions',
					'No replacement text given.',
					'What should the new instructions say? Put the full text in quotes.',
				);
			return {
				status: 'planned',
				patches: [{ op: 'replace_instructions', instructions: quoted }],
				summary: 'Replaced the instructions.',
				log,
				waves: 0,
			};
		}
		case 'add_task': {
			const cron =
				detectScheduleCron(input.request) ??
				(typeof input.answers?.cron === 'string' ? input.answers.cron : undefined);
			if (!cron)
				return ask(
					'edit.task.cron',
					'The schedule is not precise enough.',
					'How often exactly should the task run (for example "every weekday at 9am")?',
				);
			const objective =
				input.request.replace(/\b(every|daily|nightly|hourly|weekly)\b[^,.]*[,.]?/i, '').trim() ||
				input.request;
			return {
				status: 'planned',
				patches: [
					{
						op: 'add_task',
						task: {
							name: objective.slice(0, 120),
							objective,
							cronExpression: cron,
							timezone: 'UTC',
							enabled: true,
						},
					},
				],
				summary: `Added a scheduled task (${cron}).`,
				log,
				waves: 0,
			};
		}
		case 'add_sub_agent':
		case 'remove_sub_agent': {
			const name =
				input.request.match(
					/\b(?:to|the)\s+["“]?([^"”,.]+?)["”]?\s+(?:agent|sub-?agent)\b/i,
				)?.[1] ??
				input.request.match(/\b(?:delegate|hand off)\b.*?\bto\s+["“]?([^"”,.]+?)["”]?\s*$/i)?.[1];
			const pool =
				kind === 'remove_sub_agent'
					? input.catalog.agents.filter((agent) =>
							(input.config.subAgents?.agents ?? []).some((sub) => sub.agentId === agent.agentId),
						)
					: input.catalog.agents;
			const matches = name ? findByName(pool, name) : pool;
			const resolved = await resolveOne(
				input,
				matches.map((agent) => ({ id: agent.agentId, label: agent.name })),
				`Which agent should the request "${input.request}" refer to?`,
				log,
			);
			if (resolved.kind === 'ask')
				return ask(
					'edit.subAgent',
					'The sub-agent is ambiguous.',
					`Which agent: ${pool.map((agent) => agent.name).join(', ')}?`,
					pool.map((agent) => agent.agentId),
				);
			return kind === 'remove_sub_agent'
				? {
						status: 'planned',
						patches: [{ op: 'remove_sub_agent', agentId: resolved.id }],
						summary: `Removed sub-agent ${resolved.label}.`,
						log,
						waves: resolved.waves,
					}
				: {
						status: 'planned',
						patches: [
							{
								op: 'add_sub_agent',
								agentId: resolved.id,
								useWhen: `the request is about ${resolved.label}`,
							},
						],
						summary: `Added sub-agent ${resolved.label}.`,
						log,
						waves: resolved.waves,
					};
		}
		case 'set_approval':
		case 'remove_tool': {
			const mentioned = toolNames.filter(
				(toolName) =>
					input.request.toLowerCase().includes(toolName.toLowerCase().replace(/_/g, ' ')) ||
					input.request.toLowerCase().includes(toolName.toLowerCase()),
			);
			const resolved = await resolveOne(
				input,
				(mentioned.length > 0 ? mentioned : toolNames).map((toolName) => ({
					id: toolName,
					label: toolName,
				})),
				`Which tool does this change refer to: "${input.request}"?`,
				log,
			);
			if (resolved.kind === 'ask')
				return ask(
					'edit.tool',
					'The tool is ambiguous.',
					`Which tool: ${toolNames.join(', ')}?`,
					toolNames,
				);
			if (kind === 'remove_tool')
				return {
					status: 'planned',
					patches: [{ op: 'remove_tool', toolName: resolved.id }],
					summary: `Removed tool "${resolved.id}".`,
					log,
					waves: resolved.waves,
				};
			const requireApproval = !/\b(without asking|no approval|don't ask|do not ask)\b/i.test(
				input.request,
			);
			return {
				status: 'planned',
				patches: [{ op: 'set_approval', toolName: resolved.id, requireApproval }],
				summary: `${requireApproval ? 'Enabled' : 'Disabled'} approval for "${resolved.id}".`,
				log,
				waves: resolved.waves,
			};
		}
		case 'add_tool': {
			const workflowName = input.request.match(
				/\b(?:use|call|run|attach|add)s?\s+(?:the\s+)?["“]?([^"”,.]+?)["”]?\s+workflow\b/i,
			)?.[1];
			if (workflowName) {
				const found =
					findByName(input.sessionWorkflows ?? [], workflowName)[0] ??
					findByName(input.catalog.workflows, workflowName)[0];
				if (!found)
					return ask(
						'edit.workflowTool',
						'The workflow was not found.',
						`No attachable workflow named "${workflowName}" exists. Build it first with build-workflow, then add it.`,
					);
				const tool: NonNullable<AgentJsonConfig['tools']>[number] = {
					type: 'workflow',
					workflowId: found.id,
					workflow: found.name,
					name: found.name.replace(/[^A-Za-z0-9_]+/g, '_'),
					description: `Runs the "${found.name}" workflow.`,
				};
				return {
					status: 'planned',
					patches: [{ op: 'add_tool', tool }],
					summary: `Attached workflow "${found.name}" as a tool.`,
					log,
					waves: 0,
				};
			}
			const requirements = extractAgentRequirements(input.request);
			const actions =
				requirements.toolActions.length > 0
					? requirements.toolActions
					: [{ id: 'new-tool', text: input.request, params: {} }];
			const planning = await planActions({
				request: input.request,
				actions: actions.slice(0, 1),
				registry: input.catalog.nodeRegistry,
				decisions: input.decisions,
				abortSignal: input.abortSignal,
			});
			log.push(...planning.log);
			if (planning.issues.length > 0)
				return {
					status: 'needs_clarification',
					log,
					issues: planning.issues.map((issue) => ({
						...issue,
						field: issue.field.replace(/^actions\./, 'toolActions.'),
					})),
				};
			const action = planning.actions[0];
			const operation = input.catalog.nodeRegistry.require(action.operationId ?? '');
			const values = { ...action.params, ...(input.answers ?? {}) };
			const missing = operation.requiredParameters.filter(
				(definition) => !definition.derivable && values[definition.name] === undefined,
			);
			if (missing.length > 0)
				return {
					status: 'needs_clarification',
					log,
					issues: missing.map((definition) => ({
						field: `toolActions.${action.id}.${definition.name}`,
						reason: `Required by ${operation.title}.`,
						question: definition.question ?? `Provide ${definition.name}.`,
					})),
				};
			const params: Record<string, unknown> = {};
			for (const definition of [...operation.requiredParameters, ...operation.optionalParameters])
				if (values[definition.name] !== undefined)
					params[definition.name] = values[definition.name];
			const irTool: AgentToolIR = {
				id: action.id,
				kind: 'node',
				name: operation.label ?? operation.title,
				operationId: operation.id,
				params,
				description: operation.description,
				requireApproval: /\.(post|reply|update|insert|upsert|delete|create|execute)$/.test(
					operation.id,
				),
			};
			const compiled = compileAgent(
				{
					ref: 'x',
					name: 'x',
					purpose: 'x',
					instructions: { role: 'x', goals: [], rules: [] },
					channels: [],
					model: { mode: 'default' },
					tools: [irTool],
					skills: [],
					tasks: [],
					subAgents: [],
					memory: { observational: false, episodic: false },
					mcpServers: [],
					options: {},
					patternIds: [],
				},
				{ registry: input.catalog.nodeRegistry, defaultModel: null },
			);
			const tool = compiled.config.tools?.[0];
			if (!tool)
				return ask('edit.tool', 'The tool could not be compiled.', 'Which tool should be added?');
			if (tool.type !== 'custom' && toolNames.includes(tool.name ?? ''))
				tool.name = `${tool.name}_${toolNames.length + 1}`;
			return {
				status: 'planned',
				patches: [
					{ op: 'add_tool', tool },
					{
						op: 'append_rule',
						rule: `Use ${tool.type === 'custom' ? tool.id : tool.name} when ${action.text.replace(/[.]$/, '').toLowerCase()}.`,
					},
				],
				summary: `Added tool "${tool.type === 'custom' ? tool.id : tool.name}".`,
				log,
				waves: planning.waves,
			};
		}
	}
}

type ResolveOneResult = { kind: 'ask' } | { kind: 'one'; id: string; label: string; waves: number };

async function resolveOne(
	input: AgentEditPlanInput,
	candidates: Array<{ id: string; label: string }>,
	instructions: string,
	log: DecisionLogEntry[],
): Promise<ResolveOneResult> {
	if (candidates.length === 0) return { kind: 'ask' };
	if (candidates.length === 1) return { kind: 'one', ...candidates[0], waves: 0 };
	const criteria: Record<string, string | null> = {};
	for (const candidate of candidates) criteria[candidate.id] = candidate.label;
	const questions: DecisionQuestions = {
		target: { type: 'choice', instructions, criteria: withNoneOfThese(criteria) },
	};
	const outcome = await input.decisions.decide({
		name: 'agent-compiler.edit-target',
		schemaVersion: AGENT_DECISION_SCHEMA_VERSION,
		state: { request: input.request },
		questions,
		abortSignal: input.abortSignal,
	});
	log.push({
		name: 'agent-compiler.edit-target',
		schemaVersion: AGENT_DECISION_SCHEMA_VERSION,
		backend: input.decisions.kind,
		...(outcome.ok ? { model: outcome.model } : { failureReason: outcome.reason }),
		latencyMs: outcome.latencyMs,
		ok: outcome.ok,
		questionNames: ['target'],
		answers: outcome.ok ? outcome.answers : {},
		policy: {},
	});
	const resolution = resolveChoice({
		allowed: candidates.map((candidate) => candidate.id),
		answer: outcome.ok ? outcome.answers.target : undefined,
	});
	log[log.length - 1].policy.target =
		resolution.status === 'chosen' ? resolution.value : `abstain:${resolution.reason}`;
	if (resolution.status !== 'chosen') return { kind: 'ask' };
	const chosen = candidates.find((candidate) => candidate.id === resolution.value);
	return chosen ? { kind: 'one', ...chosen, waves: 1 } : { kind: 'ask' };
}
