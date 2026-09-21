import type {
	DecisionLogEntry,
	DecisionService,
} from '../../workflow-compiler/decision/decision-service';
import { resolveChoice } from '../../workflow-compiler/decision/policy';
import type { DecisionQuestions } from '../../workflow-compiler/decision/schemas';
import { planActions } from '../../workflow-compiler/modes/plan-actions';
import {
	buildClarificationQuestions,
	type ClarificationQuestion,
} from '../../workflow-compiler/requirements/clarification';
import {
	isString,
	valueOf,
	type RequirementIssue,
} from '../../workflow-compiler/requirements/types';
import {
	findByName,
	type AgentCapabilityCatalog,
	type CatalogAgent,
} from '../catalog/capabilities';
import { slug } from '../../workflow-compiler/text';
import type { AgentIR, AgentToolIR } from '../ir/schema';
import {
	missingAgentBehaviorRequirements,
	missingAgentResourceRequirements,
} from '../requirements/completeness';
import type { AgentRequirements } from '../requirements/types';
import { choiceQuestion, decide } from './decide';

export interface AgentCreatePlanInput {
	ref: string;
	request: string;
	requirements: AgentRequirements;
	catalog: AgentCapabilityCatalog;
	decisions: DecisionService;
	/** Workflows built earlier in the conversation, attachable by name or id. */
	sessionWorkflows?: Array<{ id: string; name: string; description?: string }>;
	abortSignal?: AbortSignal;
}

export interface RequiredWorkflowArtifact {
	type: 'workflow';
	name: string;
	purpose: string;
	relationship: 'agent-tool';
	requirements: string[];
}

export type AgentCreatePlanResult =
	| {
			status: 'needs_clarification';
			issues: RequirementIssue[];
			questions: ClarificationQuestion[];
			requirements: AgentRequirements;
			log: DecisionLogEntry[];
	  }
	| {
			status: 'needs_artifacts';
			artifacts: RequiredWorkflowArtifact[];
			requirements: AgentRequirements;
			log: DecisionLogEntry[];
	  }
	| {
			status: 'planned';
			ir: AgentIR;
			requirements: AgentRequirements;
			log: DecisionLogEntry[];
			waves: number;
	  };

const WRITE_OPERATIONS = /\.(post|reply|update|insert|upsert|delete|create|execute)$/;

/**
 * Create mode: requirements → one decision wave (tool operations, ambiguous
 * sub-agents) → AgentIR. Missing information becomes a clarification; a
 * workflow the agent needs but the project lacks becomes a required artifact
 * for the orchestrator to build first.
 */
export async function planAgentCreate(input: AgentCreatePlanInput): Promise<AgentCreatePlanResult> {
	const { catalog } = input;
	let requirements = input.requirements;
	const log: DecisionLogEntry[] = [];
	const clarify = (issues: RequirementIssue[]): AgentCreatePlanResult => ({
		status: 'needs_clarification',
		issues,
		questions: buildClarificationQuestions(issues),
		requirements,
		log,
	});

	const behaviorIssues = missingAgentBehaviorRequirements(requirements, catalog);
	if (behaviorIssues.length > 0) return clarify(behaviorIssues);

	const planning = await planActions({
		request: input.request,
		actions: requirements.toolActions,
		registry: catalog.nodeRegistry,
		decisions: input.decisions,
		abortSignal: input.abortSignal,
	});
	log.push(...planning.log);
	requirements = { ...requirements, toolActions: planning.actions };
	let waves = planning.waves;
	if (planning.issues.length > 0)
		return clarify(
			planning.issues.map((issue) => ({
				...issue,
				field: issue.field.replace(/^actions\./, 'toolActions.'),
			})),
		);

	// Sub-agents: exact or single fuzzy name match binds; several matches need one bounded read.
	const subAgents: AgentIR['subAgents'] = [];
	const ambiguous: Array<{ name: string; candidates: CatalogAgent[] }> = [];
	const bind = (agent: CatalogAgent, name: string) =>
		subAgents.push({
			agentId: agent.agentId,
			name: agent.name,
			useWhen: `the request is about ${name}`,
		});
	for (const name of requirements.subAgentNames) {
		const answered = requirements.answers[`subAgents.${name}`];
		const matches =
			typeof answered === 'string'
				? catalog.agents.filter((agent) => agent.agentId === answered)
				: findByName(catalog.agents, name);
		if (matches.length === 1) bind(matches[0], name);
		else if (matches.length > 1) ambiguous.push({ name, candidates: matches });
	}
	if (ambiguous.length > 0) {
		const questions: DecisionQuestions = {};
		for (const entry of ambiguous)
			questions[`subAgents.${entry.name}`] = choiceQuestion(
				`Which project agent did the user mean by "${entry.name}"?`,
				entry.candidates.map((agent) => ({ id: agent.agentId, label: agent.name })),
			);
		waves += 1;
		const outcome = await decide(
			input,
			'agent-compiler.sub-agents',
			{ request: input.request, agents: catalog.agents.map((agent) => agent.name) },
			questions,
			log,
		);
		for (const entry of ambiguous) {
			const resolution = resolveChoice({
				allowed: entry.candidates.map((agent) => agent.agentId),
				answer: outcome.ok ? outcome.answers[`subAgents.${entry.name}`] : undefined,
			});
			if (resolution.status !== 'chosen') continue;
			const agent = entry.candidates.find((candidate) => candidate.agentId === resolution.value);
			if (agent) bind(agent, entry.name);
		}
	}

	const bound = new Set(
		subAgents.map((agent) => `subAgents.${agent.useWhen?.replace('the request is about ', '')}`),
	);
	const resourceIssues = missingAgentResourceRequirements(
		requirements,
		catalog,
		catalog.nodeRegistry,
	).filter((issue) => !issue.field.startsWith('subAgents.') || !bound.has(issue.field));
	if (resourceIssues.length > 0) return clarify(resourceIssues);

	// Workflow tools: attach by name from the project or the session; otherwise the host must build them first.
	const tools: AgentToolIR[] = [];
	const artifacts: RequiredWorkflowArtifact[] = [];
	const askAlways = requirements.approvalPolicy === 'ask_always';
	for (const name of requirements.workflowTools) {
		const found =
			findByName(input.sessionWorkflows ?? [], name)[0] ?? findByName(catalog.workflows, name)[0];
		if (!found) {
			artifacts.push({
				type: 'workflow',
				name,
				purpose: `Tool for the agent: ${name}`,
				relationship: 'agent-tool',
				requirements: [
					'Starts with an Execute Workflow Trigger so the agent can call it.',
					`Implements: ${name}.`,
				],
			});
			continue;
		}
		tools.push({
			id: `workflow-${slug(found.name, 'workflow')}`,
			kind: 'workflow',
			name: found.name,
			workflowId: found.id,
			workflowName: found.name,
			useWhen: `the user needs "${found.name}".`,
			requireApproval: askAlways,
		});
	}
	if (artifacts.length > 0) return { status: 'needs_artifacts', artifacts, requirements, log };

	for (const action of requirements.toolActions) {
		if (!action.operationId) continue;
		const operation = catalog.nodeRegistry.require(action.operationId);
		const params: Record<string, unknown> = {};
		for (const definition of [...operation.requiredParameters, ...operation.optionalParameters]) {
			const value =
				action.params[definition.name] ??
				requirements.answers[`toolActions.${action.id}.${definition.name}`];
			if (value !== undefined) params[definition.name] = value;
		}
		tools.push({
			id: action.id,
			kind: 'node',
			name: operation.label ?? operation.title,
			operationId: operation.id,
			params,
			description: operation.description,
			useWhen: `the user asks to ${action.text.replace(/[.]$/, '').toLowerCase()}.`,
			requireApproval:
				askAlways ||
				(requirements.approvalPolicy === 'ask_for_writes' && WRITE_OPERATIONS.test(operation.id)),
		});
	}

	const purpose = valueOf(requirements.purpose, isString) ?? 'help the user';
	const name = valueOf(requirements.name, isString) ?? 'New Agent';
	const cronOf = (schedule: { text: string; cron?: string }) =>
		schedule.cron ?? requirements.answers[`schedules.${schedule.text}`];
	const ir: AgentIR = {
		ref: input.ref,
		name,
		purpose,
		instructions: {
			role: `You are ${name}. Your job: ${purpose}.`,
			goals: [],
			rules: [
				...requirements.rules,
				'Say when a request is outside what you can do instead of guessing.',
			],
			userText: input.request,
		},
		channels: requirements.channels.flatMap((mention) =>
			mention.supported && mention.type ? [{ type: mention.type }] : [],
		),
		model: requirements.explicitModel
			? { mode: 'explicit', model: requirements.explicitModel }
			: requirements.modelProvider
				? { mode: 'provider', provider: requirements.modelProvider }
				: { mode: 'default' },
		tools,
		skills: [],
		tasks: requirements.schedules
			.filter((schedule) => cronOf(schedule))
			.map((schedule, index) => ({
				id: `task-${index + 1}`,
				name: schedule.text.slice(0, 120),
				objective: schedule.text,
				cron: String(cronOf(schedule)),
				timezone: 'UTC',
				enabled: true,
			})),
		subAgents,
		memory: requirements.memory,
		mcpServers: [],
		options: { ...(requirements.webSearch ? { webSearch: true } : {}) },
		patternIds: ['agent_assistant'],
	};
	return { status: 'planned', ir, requirements, log, waves };
}
