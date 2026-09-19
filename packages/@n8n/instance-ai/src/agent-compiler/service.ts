import type { AgentJsonConfig } from '@n8n/api-types';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { nanoid } from 'nanoid';

import {
	NullDecisionService,
	type DecisionLogEntry,
	type DecisionService,
} from '../workflow-compiler/decision/decision-service';
import {
	buildClarificationQuestions,
	formatClarification,
	type ClarificationQuestion,
} from '../workflow-compiler/requirements/clarification';
import { resolved, type RequirementIssue } from '../workflow-compiler/requirements/types';
import type { AgentCapabilityCatalog } from './catalog/capabilities';
import {
	compileAgent,
	type AgentGeneratorMetadata,
	type CompiledAgent,
	type CompiledAgentTask,
} from './compiler/compile';
import { AGENT_CHANNEL_TYPES } from './ir/schema';
import { applyAgentPatches, planAgentEdit } from './modes/edit';
import { planAgentCreate, type RequiredWorkflowArtifact } from './modes/create';
import { extractAgentRequirements } from './requirements/extract';
import type { AgentRequirements } from './requirements/types';
import { enumerateAgentScenarios, type AgentScenario } from './scenarios/enumerate';
import {
	InMemoryAgentSessionStore,
	compiledSnapshot,
	type AgentGenerationSession,
	type AgentSessionStore,
} from './session/session';
import {
	emptyAgentVerificationReport,
	hasBlockingAgentIssues,
	levelForAgentConfig,
	validateCompiledAgent,
	type AgentVerificationReport,
} from './validation/validate';
import { AGENT_COMPILER_VERSION } from './versions';

export interface AgentCompilerServiceOptions {
	decisions?: DecisionService;
	sessions?: AgentSessionStore;
	now?: () => Date;
}

export interface AgentCompilerDiagnostics {
	sessionId: string;
	decisionCount: number;
	decisionWaves: number;
	decisionLatencyMs: number;
	timings: Record<string, number>;
	compilerVersion: string;
	decisions: DecisionLogEntry[];
}

/** Every outcome carries the session id and diagnostics; `status` picks the rest. */
export type AgentCompilerResult = { sessionId: string; diagnostics: AgentCompilerDiagnostics } & (
	| {
			status: 'needs_clarification';
			questions: ClarificationQuestion[];
			message: string;
			unresolved: RequirementIssue[];
	  }
	| { status: 'needs_artifacts'; artifacts: RequiredWorkflowArtifact[]; message: string }
	| {
			status: 'compiled';
			config: AgentJsonConfig;
			skills: CompiledAgent['skills'];
			tasks: CompiledAgentTask[];
			report: AgentVerificationReport;
			generator: AgentGeneratorMetadata;
			scenarios: AgentScenario[];
			summary: string;
			changed: string[];
	  }
	| { status: 'failed'; reason: string; report?: AgentVerificationReport }
);

interface AgentRequestBase {
	ref: string;
	request: string;
	catalog: AgentCapabilityCatalog;
	sessionId?: string;
	answers?: Record<string, unknown>;
	sessionWorkflows?: Array<{ id: string; name: string; description?: string }>;
	abortSignal?: AbortSignal;
}

export interface AgentCreateRequest extends AgentRequestBase {
	name?: string;
}

export interface AgentEditRequest extends AgentRequestBase {
	agentId: string;
	config: AgentJsonConfig;
}

/**
 * Orchestrates the decision-assisted agent compiler. Bounded decisions pick
 * operations and targets; deterministic code extracts requirements, plans the
 * IR, compiles the config and validates it. The persistence step (the host's
 * builder delegate) writes the result.
 */
export class AgentCompilerService {
	readonly decisions: DecisionService;

	private readonly sessions: AgentSessionStore;

	private readonly now: () => Date;

	constructor(options: AgentCompilerServiceOptions = {}) {
		this.decisions = options.decisions ?? new NullDecisionService();
		this.sessions = options.sessions ?? new InMemoryAgentSessionStore();
		this.now = options.now ?? (() => new Date());
	}

	async getSession(sessionId: string): Promise<AgentGenerationSession | undefined> {
		return await this.sessions.get(sessionId);
	}

	async create(input: AgentCreateRequest): Promise<AgentCompilerResult> {
		const started = Date.now();
		const session = await this.loadOrStart('create', input);
		const resumed = input.sessionId === session.id;
		if (resumed) session.messages.push(input.request);
		this.applyAnswers(session, input.answers, resumed ? input.request : undefined);
		if (input.name) session.requirements.name = resolved(input.name, 'user');
		session.timings.requirementsMs = Date.now() - started;

		const planStarted = Date.now();
		const plan = await planAgentCreate({
			ref: input.ref,
			request: session.messages.join('\n'),
			requirements: session.requirements,
			catalog: input.catalog,
			decisions: this.decisions,
			sessionWorkflows: input.sessionWorkflows,
			abortSignal: input.abortSignal,
		});
		session.timings.planningMs = Date.now() - planStarted;
		session.requirements = plan.requirements;
		session.decisions.push(...plan.log);
		if (plan.status === 'needs_clarification')
			return await this.clarify(session, plan.issues, plan.questions);
		if (plan.status === 'needs_artifacts') {
			session.status = 'needs_artifacts';
			await this.sessions.save(session);
			return {
				status: 'needs_artifacts',
				sessionId: session.id,
				artifacts: plan.artifacts,
				message: `Build ${plan.artifacts.map((artifact) => `"${artifact.name}"`).join(', ')} with build-workflow (starting with an Execute Workflow Trigger), then call again with the workflow in workflowContext.`,
				diagnostics: this.diagnostics(session),
			};
		}
		session.ir = plan.ir;
		session.status = 'compiling';
		const compileStarted = Date.now();
		const compiled = compileAgent(plan.ir, {
			registry: input.catalog.nodeRegistry,
			defaultModel: input.catalog.defaultModel,
		});
		session.timings.compileMs = Date.now() - compileStarted;
		const { config, tasks } = compiled;
		return await this.finish(
			session,
			compiled,
			validateCompiledAgent(plan.ir, compiled, input.catalog),
			enumerateAgentScenarios(plan.ir, compiled.toolNames),
			`Compiled agent "${config.name}" with ${config.tools?.length ?? 0} tool(s), ${config.integrations?.length ?? 0} channel(s), ${tasks.length} task(s).`,
			[],
		);
	}

	async edit(input: AgentEditRequest): Promise<AgentCompilerResult> {
		const started = Date.now();
		const session = await this.loadOrStart('edit', input);
		if (input.sessionId === session.id) session.messages.push(input.request);
		const plan = await planAgentEdit({
			request: session.messages.join('\n'),
			config: input.config,
			catalog: input.catalog,
			decisions: this.decisions,
			answers: input.answers,
			sessionWorkflows: input.sessionWorkflows,
			abortSignal: input.abortSignal,
		});
		session.decisions.push(...plan.log);
		session.timings.planningMs = Date.now() - started;
		if (plan.status === 'needs_clarification')
			return await this.clarify(session, plan.issues, buildClarificationQuestions(plan.issues));
		let patched: ReturnType<typeof applyAgentPatches>;
		try {
			patched = applyAgentPatches(input.config, plan.patches);
		} catch (error) {
			return await this.fail(session, getErrorMessage(error));
		}
		const report = emptyAgentVerificationReport();
		report.schema = levelForAgentConfig(patched.config, report.issues);
		const names = (patched.config.tools ?? []).map((tool) =>
			tool.type === 'custom' ? tool.id : (tool.name ?? ''),
		);
		const compiled: CompiledAgent = {
			config: patched.config,
			skills: {},
			tasks: patched.tasks,
			toolNames: Object.fromEntries(names.map((name) => [name, name])),
			generator: {
				compilerVersion: AGENT_COMPILER_VERSION,
				instructionsTemplateVersion: '1',
				nodeRegistryVersion: input.catalog.nodeRegistry.version,
				patternIds: [],
			},
			warnings: [],
		};
		return await this.finish(
			session,
			compiled,
			report,
			[],
			plan.summary,
			plan.patches.map((patch) => patch.op),
		);
	}

	// ── internals ──────────────────────────────────────────────────────────

	private async loadOrStart(
		intent: 'create' | 'edit',
		input: AgentRequestBase & { agentId?: string },
	): Promise<AgentGenerationSession> {
		const existing = input.sessionId ? await this.sessions.get(input.sessionId) : undefined;
		if (existing) return existing;
		const timestamp = this.now().toISOString();
		return {
			id: `agen_${nanoid(10)}`,
			intent,
			ref: input.ref,
			...(input.agentId ? { agentId: input.agentId } : {}),
			request: input.request,
			messages: [input.request],
			requirements: extractAgentRequirements(input.request),
			status: 'understanding_request',
			unresolved: [],
			questions: [],
			scenarios: [],
			decisions: [],
			timings: {},
			createdAt: timestamp,
			updatedAt: timestamp,
		};
	}

	private applyAnswers(
		session: AgentGenerationSession,
		answers: Record<string, unknown> | undefined,
		message?: string,
	): void {
		const pending = session.unresolved.map((issue) => issue.field);
		for (const [field, value] of Object.entries(answers ?? {}))
			setAgentRequirement(session.requirements, field, value);
		if (message && pending.length === 1 && answers?.[pending[0]] === undefined)
			setAgentRequirement(session.requirements, pending[0], inferAgentAnswer(pending[0], message));
		session.unresolved = [];
		session.questions = [];
	}

	private async clarify(
		session: AgentGenerationSession,
		issues: RequirementIssue[],
		questions: ClarificationQuestion[],
	): Promise<AgentCompilerResult> {
		session.status = 'needs_clarification';
		session.unresolved = issues;
		session.questions = questions;
		session.updatedAt = this.now().toISOString();
		await this.sessions.save(session);
		return {
			status: 'needs_clarification',
			sessionId: session.id,
			questions,
			message: formatClarification(questions),
			unresolved: issues,
			diagnostics: this.diagnostics(session),
		};
	}

	private async fail(
		session: AgentGenerationSession,
		reason: string,
		report?: AgentVerificationReport,
	): Promise<AgentCompilerResult> {
		session.status = 'failed';
		await this.sessions.save(session);
		return {
			status: 'failed',
			sessionId: session.id,
			reason,
			...(report ? { report } : {}),
			diagnostics: this.diagnostics(session),
		};
	}

	private async finish(
		session: AgentGenerationSession,
		compiled: CompiledAgent,
		report: AgentVerificationReport,
		scenarios: AgentScenario[],
		summary: string,
		changed: string[],
	): Promise<AgentCompilerResult> {
		session.compiled = compiledSnapshot(compiled);
		session.report = report;
		session.scenarios = scenarios;
		session.updatedAt = this.now().toISOString();
		if (hasBlockingAgentIssues(report))
			return await this.fail(
				session,
				report.issues
					.filter((issue) => issue.severity === 'error')
					.map((issue) => issue.message)
					.join(' '),
				report,
			);
		session.status = report.issues.some((issue) => issue.severity === 'warning')
			? 'compiled_with_unresolved_resources'
			: 'compiled';
		await this.sessions.save(session);
		return {
			status: 'compiled',
			sessionId: session.id,
			config: compiled.config,
			skills: compiled.skills,
			tasks: compiled.tasks,
			report,
			generator: compiled.generator,
			scenarios,
			summary,
			changed,
			diagnostics: this.diagnostics(session),
		};
	}

	private diagnostics(session: AgentGenerationSession): AgentCompilerDiagnostics {
		const { decisions } = session;
		return {
			sessionId: session.id,
			decisionCount: decisions.reduce((total, entry) => total + entry.questionNames.length, 0),
			decisionWaves: decisions.length,
			decisionLatencyMs: decisions.reduce((total, entry) => total + entry.latencyMs, 0),
			timings: { ...session.timings },
			compilerVersion: AGENT_COMPILER_VERSION,
			decisions,
		};
	}
}

/** Writes a clarification answer into the agent requirement state by field path. */
export function setAgentRequirement(
	requirements: AgentRequirements,
	field: string,
	value: unknown,
): void {
	if (field === 'purpose' || field === 'name') {
		requirements[field] = resolved(value, 'user');
		return;
	}
	const channel = field.match(/^channels\.(.+)$/);
	if (channel) {
		const choice = typeof value === 'string' ? value.trim().toLowerCase() : '';
		requirements.channels = requirements.channels.filter((mention) => mention.name !== channel[1]);
		const type = AGENT_CHANNEL_TYPES.find((candidate) => candidate === choice);
		if (type) requirements.channels.push({ name: type, supported: true, type });
	}
	const action = field.match(/^toolActions\.([^.]+)\.(.+)$/);
	const target = action && requirements.toolActions.find((candidate) => candidate.id === action[1]);
	if (action && target) {
		if (action[2] === 'operation')
			target.operationId = typeof value === 'string' ? value : target.operationId;
		else target.params[action[2]] = value;
	}
	requirements.answers[field] = value;
}

function inferAgentAnswer(field: string, message: string): unknown {
	const trimmed = message.trim();
	if (field.startsWith('channels.')) {
		const lower = trimmed.toLowerCase();
		const channel = ['slack', 'telegram', 'discord', 'linear'].find((name) => lower.includes(name));
		if (channel) return channel;
		if (/\bpreview\b/i.test(lower)) return 'preview';
		if (/\bworkflow|endpoint|api\b/i.test(lower)) return 'workflow_endpoint';
		return trimmed;
	}
	if (/channel$/.test(field)) return trimmed.match(/#[a-z0-9_-]+/i)?.[0] ?? trimmed;
	return trimmed;
}
