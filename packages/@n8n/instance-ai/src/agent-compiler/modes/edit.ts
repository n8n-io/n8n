import type { AgentJsonConfig } from '@n8n/api-types';
import { AGENT_MODEL_STRING_REGEX } from '@n8n/api-types';

import type {
	DecisionLogEntry,
	DecisionService,
} from '../../workflow-compiler/decision/decision-service';
import { resolveChoice } from '../../workflow-compiler/decision/policy';
import { planActions } from '../../workflow-compiler/modes/plan-actions';
import { detectScheduleCron } from '../../workflow-compiler/requirements/extract';
import type { RequirementIssue } from '../../workflow-compiler/requirements/types';
import { findByName, type AgentCapabilityCatalog } from '../catalog/capabilities';
import {
	channelIntegration,
	compileTool,
	memoryConfig,
	uniqueToolName,
	type AgentTool,
	type CompiledAgentTask,
} from '../compiler/compile';
import type { AgentToolIR } from '../ir/schema';
import { detectChannels, extractAgentRequirements } from '../requirements/extract';
import { choiceQuestion, decide, type Candidate } from './decide';

/** Minimal edits applied to an existing agent config. Untouched fields carry over. */
export type AgentPatch =
	| { op: 'rename'; name: string }
	| { op: 'add_tool'; tool: AgentTool }
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
	| { op: 'add_task'; task: CompiledAgentTask };

/** First matching cue wins, so the order is part of the contract. */
const KIND_CUES = [
	['rename', /\brename\b|\bcall (it|the agent)\b/i],
	[
		'remove_channel',
		/\b(remove|disconnect|drop|stop using)\b.*\b(slack|telegram|discord|linear)\b/i,
	],
	[
		'set_channel',
		/\b(connect|add|enable|put it on|make it available (on|in)|deploy to)\b.*\b(slack|telegram|discord|linear)\b|\b(slack|telegram|discord|linear)\b.*\b(channel|integration)\b/i,
	],
	[
		'set_model',
		/\b(model|switch to|use)\b.*\b(claude|gpt|gemini|anthropic|openai|google|mistral|grok|xai|groq|deepseek|bedrock|azure|openrouter|[a-z0-9-]+\/[a-z0-9._:-]+)\b/i,
	],
	['set_memory', /\b(memory|remember|forget)\b/i],
	['set_web_search', /\b(web search|search the web|browse)\b/i],
	['remove_sub_agent', /\b(remove|detach|stop delegating)\b.*\b(sub-?agent|agent)\b/i],
	['add_sub_agent', /\b(delegate|hand off|sub-?agent)\b/i],
	[
		'set_approval',
		/\b(approval|ask (me )?(before|first)|confirm (before|first)|without asking)\b/i,
	],
	['add_task', /\b(every|daily|nightly|hourly|weekly|schedule|each (day|week|morning))\b/i],
	[
		'remove_tool',
		/\b(remove|delete|drop|take away)\b.*\b(tool|ability|capability)\b|\b(remove|delete|drop)\b/i,
	],
	[
		'replace_instructions',
		/\b(rewrite|replace) (the |its )?(instructions|system prompt|prompt)\b/i,
	],
	[
		'add_rule',
		/\b(never|always|do not|don't|must|should|only|tell it to|make it|be more|be less)\b/i,
	],
	['add_tool', /\b(add|give|let it|allow it to|able to|also)\b/i],
] as const satisfies ReadonlyArray<readonly [string, RegExp]>;

export type EditKind = (typeof KIND_CUES)[number][0];

const WRITE_OPERATIONS = /\.(post|reply|update|insert|upsert|delete|create|execute)$/;

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
	return KIND_CUES.find(([, pattern]) => pattern.test(text))?.[0];
}

function toolNameOf(tool: AgentTool): string {
	return tool.type === 'custom'
		? tool.id
		: (tool.name ?? (tool.type === 'workflow' ? tool.workflow : ''));
}

/** Applies patches to a copy of the config. Throws on a patch that names a missing item. */
export function applyAgentPatches(
	config: AgentJsonConfig,
	patches: readonly AgentPatch[],
): { config: AgentJsonConfig; tasks: CompiledAgentTask[] } {
	const result: AgentJsonConfig = structuredClone(config);
	const tasks: CompiledAgentTask[] = [];
	const missingTool = (toolName: string) =>
		new Error(`Tool "${toolName}" does not exist on the agent.`);
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
				if (result.tools.length === before) throw missingTool(patch.toolName);
				break;
			}
			case 'set_channel':
				result.integrations = [
					...(result.integrations ?? []).filter((i) => i.type !== patch.integration.type),
					patch.integration,
				];
				break;
			case 'remove_channel':
				result.integrations = (result.integrations ?? []).filter((i) => i.type !== patch.type);
				break;
			case 'set_model':
				result.model = patch.model;
				if (patch.credential) result.credential = patch.credential;
				break;
			case 'set_memory':
				result.memory = memoryConfig(patch.observational, patch.episodic);
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
			case 'add_sub_agent':
			case 'remove_sub_agent': {
				const agents = (result.subAgents?.agents ?? []).filter((a) => a.agentId !== patch.agentId);
				if (patch.op === 'add_sub_agent')
					agents.push({
						agentId: patch.agentId,
						...(patch.useWhen ? { useWhen: patch.useWhen } : {}),
					});
				result.subAgents = { ...(result.subAgents ?? {}), agents };
				break;
			}
			case 'set_approval': {
				const tool = (result.tools ?? []).find((t) => toolNameOf(t) === patch.toolName);
				if (!tool) throw missingTool(patch.toolName);
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
	if (!/^## Rules$/m.test(instructions)) return `${instructions.trimEnd()}\n\n## Rules\n${line}\n`;
	return instructions.replace(
		/(^## Rules\n(?:- .*\n?)*)/m,
		(block) => `${block.trimEnd()}\n${line}\n`,
	);
}

/**
 * Edit mode: classify the change, resolve the target with a bounded decision
 * only when the text is ambiguous, and emit a minimal patch set.
 */
export async function planAgentEdit(input: AgentEditPlanInput): Promise<AgentEditPlanResult> {
	const log: DecisionLogEntry[] = [];
	const { request, config, catalog } = input;
	const kind = detectEditKind(request);
	const toolNames = (config.tools ?? []).map(toolNameOf);
	const clarify = (issues: RequirementIssue[]): AgentEditPlanResult => ({
		status: 'needs_clarification',
		log,
		issues,
	});
	const ask = (field: string, reason: string, question: string, candidates?: unknown[]) =>
		clarify([{ field, reason, question, ...(candidates ? { candidates } : {}) }]);
	const planned = (patches: AgentPatch[], summary: string, waves = 0): AgentEditPlanResult => ({
		status: 'planned',
		patches,
		summary,
		log,
		waves,
	});
	const answer = (key: string): string | undefined => {
		const value = input.answers?.[key];
		return typeof value === 'string' ? value : undefined;
	};

	if (!kind)
		return ask(
			'edit.kind',
			'The requested change is not recognized.',
			'Should I add or remove a tool, connect or remove a channel, change the model, memory, rules, or schedule, or rename the agent?',
		);

	switch (kind) {
		case 'rename': {
			const name = request.match(/\b(?:to|called|named)\s+["“]?([^"”]+?)["”]?\s*$/i)?.[1];
			if (!name) return ask('edit.name', 'No new name given.', 'What should the agent be called?');
			return planned([{ op: 'rename', name }], `Renamed the agent to "${name}".`);
		}
		case 'set_channel':
		case 'remove_channel': {
			const labels = catalog.channels.map((channel) => channel.label).join(', ');
			const mention = detectChannels(request)[0];
			if (!mention) return ask('edit.channel', 'No channel named.', `Which channel: ${labels}?`);
			if (!mention.supported || !mention.type)
				return ask(
					`channels.${mention.name}`,
					`${mention.name} is not supported.`,
					`Agents cannot connect to ${mention.name} here. Supported channels: ${labels}.`,
				);
			const { type } = mention;
			if (kind === 'remove_channel')
				return planned([{ op: 'remove_channel', type }], `Removed the ${type} channel.`);
			const existing = (config.integrations ?? []).find((i) => i.type === type);
			const credentialId = answer('credentialId') ?? existing?.credentialId ?? '';
			return planned(
				[{ op: 'set_channel', integration: channelIntegration({ type, credentialId }) }],
				`Connected the ${type} channel${credentialId ? '' : ' (credential still needed)'}.`,
			);
		}
		case 'set_model': {
			const explicit = request.match(/\b([a-z0-9-]+\/[a-z0-9._:-]+(?:\/[a-z0-9._:-]+)*)\b/i)?.[1];
			if (explicit && AGENT_MODEL_STRING_REGEX.test(explicit)) {
				const model = explicit.toLowerCase();
				const credential = answer('credentialId');
				return planned(
					[{ op: 'set_model', model, ...(credential !== undefined ? { credential } : {}) }],
					`Set the model to ${model}.`,
				);
			}
			const provider = extractAgentRequirements(request).modelProvider;
			const fallback = catalog.defaultModel;
			if (provider && fallback?.model.startsWith(`${provider}/`))
				return planned([{ op: 'set_model', ...fallback }], `Set the model to ${fallback.model}.`);
			return ask(
				'edit.model',
				'The exact model is not known.',
				`Which model, as "provider/model-name" (for example anthropic/claude-sonnet-4-5)${provider ? ` from ${provider}` : ''}?`,
			);
		}
		case 'set_memory': {
			const off = /\b(disable|turn off|forget|no memory|remove memory)\b/i.test(request);
			const episodic = /\b(episodic|facts|preferences)\b/i.test(request);
			return planned(
				[{ op: 'set_memory', observational: !off, episodic: !off && episodic }],
				off
					? 'Disabled memory.'
					: `Enabled ${episodic ? 'observational and episodic' : 'observational'} memory.`,
			);
		}
		case 'set_web_search': {
			const off = /\b(disable|turn off|remove|no)\b/i.test(request);
			return planned(
				[{ op: 'set_web_search', enabled: !off }],
				`${off ? 'Disabled' : 'Enabled'} web search.`,
			);
		}
		case 'add_rule':
			return planned(
				[{ op: 'append_rule', rule: request.trim().replace(/[.]$/, '') }],
				'Added a rule to the instructions.',
			);
		case 'replace_instructions': {
			const instructions = request.match(/["“]([^"”]{10,})["”]/)?.[1];
			if (!instructions)
				return ask(
					'edit.instructions',
					'No replacement text given.',
					'What should the new instructions say? Put the full text in quotes.',
				);
			return planned([{ op: 'replace_instructions', instructions }], 'Replaced the instructions.');
		}
		case 'add_task': {
			const cron = detectScheduleCron(request) ?? answer('cron');
			if (!cron)
				return ask(
					'edit.task.cron',
					'The schedule is not precise enough.',
					'How often exactly should the task run (for example "every weekday at 9am")?',
				);
			const objective =
				request.replace(/\b(every|daily|nightly|hourly|weekly)\b[^,.]*[,.]?/i, '').trim() ||
				request;
			const task = {
				name: objective.slice(0, 120),
				objective,
				cronExpression: cron,
				timezone: 'UTC',
				enabled: true,
			};
			return planned([{ op: 'add_task', task }], `Added a scheduled task (${cron}).`);
		}
		case 'add_sub_agent':
		case 'remove_sub_agent': {
			const name =
				request.match(/\b(?:to|the)\s+["“]?([^"”,.]+?)["”]?\s+(?:agent|sub-?agent)\b/i)?.[1] ??
				request.match(/\b(?:delegate|hand off)\b.*?\bto\s+["“]?([^"”,.]+?)["”]?\s*$/i)?.[1];
			const attached = config.subAgents?.agents ?? [];
			const pool =
				kind === 'remove_sub_agent'
					? catalog.agents.filter((agent) => attached.some((sub) => sub.agentId === agent.agentId))
					: catalog.agents;
			const resolved = await resolveOne(
				input,
				(name ? findByName(pool, name) : pool).map((agent) => ({
					id: agent.agentId,
					label: agent.name,
				})),
				`Which agent should the request "${request}" refer to?`,
				log,
			);
			if (!resolved)
				return ask(
					'edit.subAgent',
					'The sub-agent is ambiguous.',
					`Which agent: ${pool.map((agent) => agent.name).join(', ')}?`,
					pool.map((agent) => agent.agentId),
				);
			const { id: agentId, label, waves } = resolved;
			return kind === 'remove_sub_agent'
				? planned([{ op: 'remove_sub_agent', agentId }], `Removed sub-agent ${label}.`, waves)
				: planned(
						[{ op: 'add_sub_agent', agentId, useWhen: `the request is about ${label}` }],
						`Added sub-agent ${label}.`,
						waves,
					);
		}
		case 'set_approval':
		case 'remove_tool': {
			const lower = request.toLowerCase();
			const mentioned = toolNames.filter(
				(toolName) =>
					lower.includes(toolName.toLowerCase().replace(/_/g, ' ')) ||
					lower.includes(toolName.toLowerCase()),
			);
			const resolved = await resolveOne(
				input,
				(mentioned.length > 0 ? mentioned : toolNames).map((id) => ({ id, label: id })),
				`Which tool does this change refer to: "${request}"?`,
				log,
			);
			if (!resolved)
				return ask(
					'edit.tool',
					'The tool is ambiguous.',
					`Which tool: ${toolNames.join(', ')}?`,
					toolNames,
				);
			const { id: toolName, waves } = resolved;
			if (kind === 'remove_tool')
				return planned([{ op: 'remove_tool', toolName }], `Removed tool "${toolName}".`, waves);
			const requireApproval = !/\b(without asking|no approval|don't ask|do not ask)\b/i.test(
				request,
			);
			return planned(
				[{ op: 'set_approval', toolName, requireApproval }],
				`${requireApproval ? 'Enabled' : 'Disabled'} approval for "${toolName}".`,
				waves,
			);
		}
		case 'add_tool': {
			const workflowName = request.match(
				/\b(?:use|call|run|attach|add)s?\s+(?:the\s+)?["“]?([^"”,.]+?)["”]?\s+workflow\b/i,
			)?.[1];
			if (workflowName) {
				const found =
					findByName(input.sessionWorkflows ?? [], workflowName)[0] ??
					findByName(catalog.workflows, workflowName)[0];
				if (!found)
					return ask(
						'edit.workflowTool',
						'The workflow was not found.',
						`No attachable workflow named "${workflowName}" exists. Build it first with build-workflow, then add it.`,
					);
				const tool: AgentTool = {
					type: 'workflow',
					workflowId: found.id,
					workflow: found.name,
					name: found.name.replace(/[^A-Za-z0-9_]+/g, '_'),
					description: `Runs the "${found.name}" workflow.`,
				};
				return planned([{ op: 'add_tool', tool }], `Attached workflow "${found.name}" as a tool.`);
			}
			const { toolActions } = extractAgentRequirements(request);
			const actions =
				toolActions.length > 0 ? toolActions : [{ id: 'new-tool', text: request, params: {} }];
			const planning = await planActions({
				request,
				actions: actions.slice(0, 1),
				registry: catalog.nodeRegistry,
				decisions: input.decisions,
				abortSignal: input.abortSignal,
			});
			log.push(...planning.log);
			if (planning.issues.length > 0)
				return clarify(
					planning.issues.map((issue) => ({
						...issue,
						field: issue.field.replace(/^actions\./, 'toolActions.'),
					})),
				);
			const action = planning.actions[0];
			const operation = catalog.nodeRegistry.require(action.operationId ?? '');
			const values = { ...action.params, ...(input.answers ?? {}) };
			const missing = operation.requiredParameters.filter(
				(definition) => !definition.derivable && values[definition.name] === undefined,
			);
			if (missing.length > 0)
				return clarify(
					missing.map((definition) => ({
						field: `toolActions.${action.id}.${definition.name}`,
						reason: `Required by ${operation.title}.`,
						question: definition.question ?? `Provide ${definition.name}.`,
					})),
				);
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
				requireApproval: WRITE_OPERATIONS.test(operation.id),
			};
			const tool = compileTool(
				irTool,
				uniqueToolName(irTool.name, new Set()),
				{ registry: catalog.nodeRegistry },
				[],
			);
			if (tool.type !== 'custom' && toolNames.includes(tool.name ?? ''))
				tool.name = `${tool.name}_${toolNames.length + 1}`;
			const toolName = tool.type === 'custom' ? tool.id : tool.name;
			return planned(
				[
					{ op: 'add_tool', tool },
					{
						op: 'append_rule',
						rule: `Use ${toolName} when ${action.text.replace(/[.]$/, '').toLowerCase()}.`,
					},
				],
				`Added tool "${toolName}".`,
				planning.waves,
			);
		}
	}
}

async function resolveOne(
	input: AgentEditPlanInput,
	candidates: Candidate[],
	instructions: string,
	log: DecisionLogEntry[],
): Promise<(Candidate & { waves: number }) | undefined> {
	if (candidates.length === 0) return undefined;
	if (candidates.length === 1) return { ...candidates[0], waves: 0 };
	const outcome = await decide(
		input,
		'agent-compiler.edit-target',
		{ request: input.request },
		{ target: choiceQuestion(instructions, candidates) },
		log,
	);
	const resolution = resolveChoice({
		allowed: candidates.map((candidate) => candidate.id),
		answer: outcome.ok ? outcome.answers.target : undefined,
	});
	log[log.length - 1].policy.target =
		resolution.status === 'chosen' ? resolution.value : `abstain:${resolution.reason}`;
	if (resolution.status !== 'chosen') return undefined;
	const chosen = candidates.find((candidate) => candidate.id === resolution.value);
	return chosen && { ...chosen, waves: 1 };
}
