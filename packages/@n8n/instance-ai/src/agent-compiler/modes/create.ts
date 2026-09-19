import type {
	DecisionLogEntry,
	DecisionService,
} from '../../workflow-compiler/decision/decision-service';
import { resolveChoice } from '../../workflow-compiler/decision/policy';
import { withNoneOfThese, type DecisionQuestions } from '../../workflow-compiler/decision/schemas';
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
import { findByName, type AgentCapabilityCatalog } from '../catalog/capabilities';
import type { AgentIR, AgentToolIR } from '../ir/schema';
import {
	missingAgentBehaviorRequirements,
	missingAgentResourceRequirements,
} from '../requirements/completeness';
import type { AgentRequirements } from '../requirements/types';
import { AGENT_DECISION_SCHEMA_VERSION } from '../versions';

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

function toolNameFor(
	action: { text: string; operationId?: string },
	catalog: AgentCapabilityCatalog,
): string {
	const operation = action.operationId ? catalog.nodeRegistry.get(action.operationId) : undefined;
	return operation?.label ?? operation?.title ?? action.text;
}

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

	const behaviorIssues = missingAgentBehaviorRequirements(requirements, catalog);
	if (behaviorIssues.length > 0) {
		return {
			status: 'needs_clarification',
			issues: behaviorIssues,
			questions: buildClarificationQuestions(behaviorIssues),
			requirements,
			log,
		};
	}

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
	if (planning.issues.length > 0) {
		const issues = planning.issues.map((issue) => ({
			...issue,
			field: issue.field.replace(/^actions\./, 'toolActions.'),
		}));
		return {
			status: 'needs_clarification',
			issues,
			questions: buildClarificationQuestions(issues),
			requirements,
			log,
		};
	}

	// Sub-agents: exact or single fuzzy name match binds; several matches need one bounded read.
	const subAgents: AgentIR['subAgents'] = [];
	const ambiguous: Array<{ name: string; candidates: AgentCapabilityCatalog['agents'] }> = [];
	for (const name of requirements.subAgentNames) {
		const answered = requirements.answers[`subAgents.${name}`];
		const matches =
			typeof answered === 'string'
				? catalog.agents.filter((agent) => agent.agentId === answered)
				: findByName(catalog.agents, name);
		if (matches.length === 1)
			subAgents.push({
				agentId: matches[0].agentId,
				name: matches[0].name,
				useWhen: `the request is about ${name}`,
			});
		else if (matches.length > 1) ambiguous.push({ name, candidates: matches });
	}
	if (ambiguous.length > 0) {
		const questions: DecisionQuestions = {};
		for (const entry of ambiguous) {
			const criteria: Record<string, string | null> = {};
			for (const agent of entry.candidates) criteria[agent.agentId] = agent.name;
			questions[`subAgents.${entry.name}`] = {
				type: 'choice',
				instructions: `Which project agent did the user mean by "${entry.name}"?`,
				criteria: withNoneOfThese(criteria),
			};
		}
		waves += 1;
		const outcome = await input.decisions.decide({
			name: 'agent-compiler.sub-agents',
			schemaVersion: AGENT_DECISION_SCHEMA_VERSION,
			state: { request: input.request, agents: catalog.agents.map((agent) => agent.name) },
			questions,
			abortSignal: input.abortSignal,
		});
		log.push({
			name: 'agent-compiler.sub-agents',
			schemaVersion: AGENT_DECISION_SCHEMA_VERSION,
			backend: input.decisions.kind,
			...(outcome.ok ? { model: outcome.model } : { failureReason: outcome.reason }),
			latencyMs: outcome.latencyMs,
			ok: outcome.ok,
			questionNames: Object.keys(questions),
			answers: outcome.ok ? outcome.answers : {},
			policy: {},
		});
		for (const entry of ambiguous) {
			const resolution = resolveChoice({
				allowed: entry.candidates.map((agent) => agent.agentId),
				answer: outcome.ok ? outcome.answers[`subAgents.${entry.name}`] : undefined,
			});
			if (resolution.status === 'chosen') {
				const agent = entry.candidates.find((candidate) => candidate.agentId === resolution.value);
				if (agent)
					subAgents.push({
						agentId: agent.agentId,
						name: agent.name,
						useWhen: `the request is about ${entry.name}`,
					});
			} else {
				requirements = { ...requirements, answers: { ...requirements.answers } };
			}
		}
	}

	const resourceIssues = missingAgentResourceRequirements(
		requirements,
		catalog,
		catalog.nodeRegistry,
	).filter(
		(issue) =>
			!issue.field.startsWith('subAgents.') ||
			!subAgents.some(
				(agent) =>
					issue.field === `subAgents.${agent.useWhen?.replace('the request is about ', '')}`,
			),
	);
	if (resourceIssues.length > 0) {
		return {
			status: 'needs_clarification',
			issues: resourceIssues,
			questions: buildClarificationQuestions(resourceIssues),
			requirements,
			log,
		};
	}

	// Workflow tools: attach by name from the project or the session; otherwise the host must build them first.
	const tools: AgentToolIR[] = [];
	const artifacts: RequiredWorkflowArtifact[] = [];
	const sessionWorkflows = input.sessionWorkflows ?? [];
	for (const name of requirements.workflowTools) {
		const fromSession = findByName(sessionWorkflows, name)[0];
		const fromProject = findByName(catalog.workflows, name)[0];
		const found = fromSession ?? fromProject;
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
			id: `workflow-${slug(found.name)}`,
			kind: 'workflow',
			name: found.name,
			workflowId: found.id,
			workflowName: found.name,
			useWhen: `the user needs "${found.name}".`,
			requireApproval: requirements.approvalPolicy === 'ask_always',
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
		const isWrite = WRITE_OPERATIONS.test(operation.id);
		tools.push({
			id: action.id,
			kind: 'node',
			name: toolNameFor(action, catalog),
			operationId: operation.id,
			params,
			description: operation.description,
			useWhen: `the user asks to ${action.text.replace(/[.]$/, '').toLowerCase()}.`,
			requireApproval:
				requirements.approvalPolicy === 'ask_always' ||
				(requirements.approvalPolicy === 'ask_for_writes' && isWrite),
		});
	}

	const purpose = valueOf(requirements.purpose, isString) ?? 'help the user';
	const name = valueOf(requirements.name, isString) ?? 'New Agent';
	const channelTypes = requirements.channels
		.filter((mention) => mention.supported && mention.type)
		.map((mention) => mention.type);
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
		channels: channelTypes
			.filter((type): type is NonNullable<typeof type> => type !== undefined)
			.map((type) => ({ type })),
		model: requirements.explicitModel
			? { mode: 'explicit', model: requirements.explicitModel }
			: requirements.modelProvider
				? { mode: 'provider', provider: requirements.modelProvider }
				: { mode: 'default' },
		tools,
		skills: [],
		tasks: requirements.schedules
			.filter((schedule) => schedule.cron ?? requirements.answers[`schedules.${schedule.text}`])
			.map((schedule, index) => ({
				id: `task-${index + 1}`,
				name: schedule.text.slice(0, 120),
				objective: schedule.text,
				cron: String(schedule.cron ?? requirements.answers[`schedules.${schedule.text}`]),
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

function slug(value: string): string {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'workflow'
	);
}
