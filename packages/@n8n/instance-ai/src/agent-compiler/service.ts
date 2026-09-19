import type { AgentJsonConfig } from '@n8n/api-types';
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

export type AgentCompilerResult =
	| {
			status: 'needs_clarification';
			sessionId: string;
			questions: ClarificationQuestion[];
			message: string;
			unresolved: RequirementIssue[];
			diagnostics: AgentCompilerDiagnostics;
	  }
	| {
			status: 'needs_artifacts';
			sessionId: string;
			artifacts: RequiredWorkflowArtifact[];
			message: string;
			diagnostics: AgentCompilerDiagnostics;
	  }
	| {
			status: 'compiled';
			sessionId: string;
			config: AgentJsonConfig;
			skills: CompiledAgent['skills'];
			tasks: CompiledAgentTask[];
			report: AgentVerificationReport;
			generator: AgentGeneratorMetadata;
			scenarios: AgentScenario[];
			summary: string;
			changed: string[];
			diagnostics: AgentCompilerDiagnostics;
	  }
	| {
			status: 'failed';
			sessionId: string;
			reason: string;
			report?: AgentVerificationReport;
			diagnostics: AgentCompilerDiagnostics;
	  };

export interface AgentCreateRequest {
	ref: string;
	request: string;
	catalog: AgentCapabilityCatalog;
	sessionId?: string;
	answers?: Record<string, unknown>;
	name?: string;
	sessionWorkflows?: Array<{ id: string; name: string; description?: string }>;
	abortSignal?: AbortSignal;
}

export interface AgentEditRequest {
	ref: string;
	agentId: string;
	request: string;
	config: AgentJsonConfig;
	catalog: AgentCapabilityCatalog;
	sessionId?: string;
	answers?: Record<string, unknown>;
	sessionWorkflows?: Array<{ id: string; name: string; description?: string }>;
	abortSignal?: AbortSignal;
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
		const session = await this.loadOrStart('create', input.ref, input.request, input.sessionId);
		if (input.sessionId && session.id === input.sessionId) {
			session.messages.push(input.request);
			this.applyAnswers(session, input.answers, input.request);
		} else {
			this.applyAnswers(session, input.answers);
		}
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
		const report = validateCompiledAgent(plan.ir, compiled, input.catalog);
		const scenarios = enumerateAgentScenarios(plan.ir, compiled.toolNames);
		return await this.finish(
			session,
			compiled,
			report,
			scenarios,
			`Compiled agent "${compiled.config.name}" with ${compiled.config.tools?.length ?? 0} tool(s), ${compiled.config.integrations?.length ?? 0} channel(s), ${compiled.tasks.length} task(s).`,
			[],
		);
	}

	async edit(input: AgentEditRequest): Promise<AgentCompilerResult> {
		const started = Date.now();
		const session = await this.loadOrStart(
			'edit',
			input.ref,
			input.request,
			input.sessionId,
			input.agentId,
		);
		if (input.sessionId && session.id === input.sessionId) session.messages.push(input.request);
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
			session.status = 'failed';
			await this.sessions.save(session);
			return {
				status: 'failed',
				sessionId: session.id,
				reason: error instanceof Error ? error.message : String(error),
				diagnostics: this.diagnostics(session),
			};
		}
		const report = emptyAgentVerificationReport();
		report.schema = levelForAgentConfig(patched.config, report.issues);
		const compiled: CompiledAgent = {
			config: patched.config,
			skills: {},
			tasks: patched.tasks,
			toolNames: Object.fromEntries(
				(patched.config.tools ?? []).map((tool) => [
					tool.type === 'custom' ? tool.id : (tool.name ?? ''),
					tool.type === 'custom' ? tool.id : (tool.name ?? ''),
				]),
			),
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
		ref: string,
		request: string,
		sessionId: string | undefined,
		agentId?: string,
	): Promise<AgentGenerationSession> {
		if (sessionId) {
			const existing = await this.sessions.get(sessionId);
			if (existing) return existing;
		}
		const timestamp = this.now().toISOString();
		return {
			id: `agen_${nanoid(10)}`,
			intent,
			ref,
			...(agentId ? { agentId } : {}),
			request,
			messages: [request],
			requirements: extractAgentRequirements(request),
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
		if (message && pending.length === 1 && answers?.[pending[0]] === undefined) {
			setAgentRequirement(session.requirements, pending[0], inferAgentAnswer(pending[0], message));
		}
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
		if (hasBlockingAgentIssues(report)) {
			session.status = 'failed';
			await this.sessions.save(session);
			return {
				status: 'failed',
				sessionId: session.id,
				reason: report.issues
					.filter((issue) => issue.severity === 'error')
					.map((issue) => issue.message)
					.join(' '),
				report,
				diagnostics: this.diagnostics(session),
			};
		}
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
		return {
			sessionId: session.id,
			decisionCount: session.decisions.reduce(
				(total, entry) => total + entry.questionNames.length,
				0,
			),
			decisionWaves: session.decisions.length,
			decisionLatencyMs: session.decisions.reduce((total, entry) => total + entry.latencyMs, 0),
			timings: { ...session.timings },
			compilerVersion: AGENT_COMPILER_VERSION,
			decisions: session.decisions,
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
		if (
			choice === 'slack' ||
			choice === 'telegram' ||
			choice === 'discord' ||
			choice === 'linear'
		) {
			requirements.channels.push({ name: choice, supported: true, type: choice });
		}
	}
	const action = field.match(/^toolActions\.([^.]+)\.(.+)$/);
	if (action) {
		const target = requirements.toolActions.find((candidate) => candidate.id === action[1]);
		if (target) {
			if (action[2] === 'operation')
				target.operationId = typeof value === 'string' ? value : target.operationId;
			else target.params[action[2]] = value;
		}
	}
	requirements.answers[field] = value;
}

function inferAgentAnswer(field: string, message: string): unknown {
	const trimmed = message.trim();
	if (field.startsWith('channels.')) {
		const lower = trimmed.toLowerCase();
		for (const channel of ['slack', 'telegram', 'discord', 'linear'])
			if (lower.includes(channel)) return channel;
		if (/\bpreview\b/i.test(lower)) return 'preview';
		if (/\bworkflow|endpoint|api\b/i.test(lower)) return 'workflow_endpoint';
		return trimmed;
	}
	if (/channel$/.test(field)) return trimmed.match(/#[a-z0-9_-]+/i)?.[0] ?? trimmed;
	return trimmed;
}
