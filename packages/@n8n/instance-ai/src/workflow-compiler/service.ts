import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';

import type { ExecutionDebugInfo } from '../types';
import { NodeRegistry } from './catalog/node-registry';
import { compileWorkflow, type GeneratorMetadata } from './compiler/compile';
import {
	NullDecisionService,
	type DecisionLogEntry,
	type DecisionService,
} from './decision/decision-service';
import { validateBundleIr, validateWorkflowIr } from './ir/validate-ir';
import type { WorkflowIR } from './ir/schema';
import { planCreate } from './modes/create';
import { planDebug, type DebugPlanResult } from './modes/debug';
import { planEdit } from './modes/edit';
import { affectedNodeNames, applyPatches, type WorkflowPatch } from './modes/patch';
import { PatternRegistry } from './patterns/registry';
import { enumerateExecutionPaths, type ExecutionPath } from './paths/enumerate-paths';
import {
	buildClarificationQuestions,
	formatClarification,
	type ClarificationQuestion,
} from './requirements/clarification';
import { extractRequirements } from './requirements/extract';
import {
	resolved,
	type Intent,
	type RequirementIssue,
	type Requirements,
} from './requirements/types';
import { InMemorySessionStore, type GenerationSession, type SessionStore } from './session/session';
import { validateExpressions } from './validation/expressions';
import {
	emptyVerificationReport,
	hasBlockingIssues,
	levelFor,
	type VerificationReport,
} from './validation/report';
import { validateStructure } from './validation/structural';
import { validateCompiledWorkflow } from './validation/validate';
import { COMPILER_VERSION } from './versions';

export interface WorkflowCompilerServiceOptions {
	registry?: NodeRegistry;
	patterns?: PatternRegistry;
	decisions?: DecisionService;
	sessions?: SessionStore;
	now?: () => Date;
}

export interface CompilerDiagnostics {
	sessionId: string;
	planningPath: GenerationSession['planningPath'];
	decisionCount: number;
	decisionWaves: number;
	decisionLatencyMs: number;
	timings: Record<string, number>;
	compilerVersion: string;
	decisions: DecisionLogEntry[];
}

export type CompilerResult =
	| {
			status: 'needs_clarification';
			sessionId: string;
			questions: ClarificationQuestion[];
			message: string;
			unresolved: RequirementIssue[];
			diagnostics: CompilerDiagnostics;
	  }
	| {
			status: 'compiled';
			sessionId: string;
			workflow: WorkflowJSON;
			report: VerificationReport;
			generator: GeneratorMetadata;
			ir?: WorkflowIR;
			executionPaths: ExecutionPath[];
			summary: string;
			/** Nodes an edit or debug patch touched; empty for a fresh build. */
			changedNodeNames: string[];
			diagnostics: CompilerDiagnostics;
	  }
	| {
			status: 'needs_setup';
			sessionId: string;
			summary: string;
			credentialTypes: string[];
			diagnostics: CompilerDiagnostics;
	  }
	| {
			status: 'failed';
			sessionId: string;
			reason: string;
			report?: VerificationReport;
			diagnostics: CompilerDiagnostics;
	  };

export interface CreateRequest {
	request: string;
	sessionId?: string;
	answers?: Record<string, unknown>;
	name?: string;
	abortSignal?: AbortSignal;
}

export interface EditRequest {
	request: string;
	workflow: WorkflowJSON;
	workflowId: string;
	sessionId?: string;
	answers?: Record<string, unknown>;
	abortSignal?: AbortSignal;
}

export interface DebugRequest {
	request?: string;
	workflow: WorkflowJSON;
	workflowId: string;
	execution: ExecutionDebugInfo;
	sessionId?: string;
	abortSignal?: AbortSignal;
}

/**
 * Orchestrates the decision-assisted compiler: requirements → bounded
 * decisions → IR → deterministic compile → deterministic validation. Only the
 * decision service touches a model; everything else is code.
 */
export class WorkflowCompilerService {
	readonly registry: NodeRegistry;

	readonly patterns: PatternRegistry;

	readonly decisions: DecisionService;

	private readonly sessions: SessionStore;

	private readonly now: () => Date;

	constructor(options: WorkflowCompilerServiceOptions = {}) {
		this.registry = options.registry ?? new NodeRegistry();
		this.patterns = options.patterns ?? new PatternRegistry();
		this.decisions = options.decisions ?? new NullDecisionService();
		this.sessions = options.sessions ?? new InMemorySessionStore();
		this.now = options.now ?? (() => new Date());
	}

	async getSession(sessionId: string): Promise<GenerationSession | undefined> {
		return await this.sessions.get(sessionId);
	}

	async create(input: CreateRequest): Promise<CompilerResult> {
		const started = Date.now();
		const session = await this.loadOrStart('create', input.request, input.sessionId);
		if (input.sessionId && session.id === input.sessionId) {
			session.messages.push(input.request);
			this.applyAnswers(session, input.answers, input.request);
		} else {
			session.requirements = extractRequirements(input.request);
			session.requirements.intent = resolved('create', 'user');
			this.applyAnswers(session, input.answers);
		}
		if (input.name) session.requirements.workflowName = resolved(input.name, 'user');
		session.timings.requirementsMs = Date.now() - started;

		const planStarted = Date.now();
		const plan = await planCreate({
			request: session.messages.join('\n'),
			requirements: session.requirements,
			registry: this.registry,
			patterns: this.patterns,
			decisions: this.decisions,
			abortSignal: input.abortSignal,
		});
		session.timings.planningMs = Date.now() - planStarted;
		session.requirements = plan.requirements;
		if (plan.planning) session.decisions.push(...plan.planning.log);
		if (plan.status === 'needs_clarification') {
			return await this.clarify(session, plan.issues, plan.questions);
		}
		session.ir = plan.ir;
		return await this.compileSession(session, plan.ir);
	}

	async edit(input: EditRequest): Promise<CompilerResult> {
		const started = Date.now();
		const session = await this.loadOrStart(
			'edit',
			input.request,
			input.sessionId,
			input.workflowId,
		);
		session.planningPath = 'patch';
		if (input.sessionId && session.id === input.sessionId) session.messages.push(input.request);
		const plan = await planEdit({
			request: session.messages.join('\n'),
			workflow: input.workflow,
			registry: this.registry,
			decisions: this.decisions,
			answers: input.answers,
			abortSignal: input.abortSignal,
		});
		session.decisions.push(...plan.log);
		session.timings.planningMs = Date.now() - started;
		if (plan.status === 'needs_clarification') {
			return await this.clarify(session, plan.issues, buildClarificationQuestions(plan.issues));
		}
		return await this.applyPatchSet(session, input.workflow, plan.patches, plan.summary);
	}

	async debug(input: DebugRequest): Promise<CompilerResult> {
		const started = Date.now();
		const session = await this.loadOrStart(
			'debug',
			input.request ?? `Debug execution ${input.execution.executionId ?? ''}`.trim(),
			input.sessionId,
			input.workflowId,
		);
		session.planningPath = 'debug';
		const plan: DebugPlanResult = planDebug({
			workflow: input.workflow,
			execution: input.execution,
			registry: this.registry,
			request: input.request,
		});
		session.timings.planningMs = Date.now() - started;
		const diagnostics = this.diagnostics(session);
		switch (plan.fix.kind) {
			case 'patch':
				return await this.applyPatchSet(
					session,
					input.workflow,
					plan.fix.patches,
					`${plan.fix.summary} Diagnosis: ${plan.diagnosis.failureClass}.`,
				);
			case 'setup':
				session.status = 'compiled_with_unresolved_resources';
				await this.sessions.save(session);
				return {
					status: 'needs_setup',
					sessionId: session.id,
					summary: plan.fix.summary,
					credentialTypes: plan.fix.credentialTypes,
					diagnostics,
				};
			case 'needs_user_input': {
				const issue: RequirementIssue = {
					field: `debug.${plan.diagnosis.failedNode ?? 'workflow'}`,
					reason: plan.fix.summary,
					question: plan.fix.question,
				};
				return await this.clarify(session, [issue], buildClarificationQuestions([issue]));
			}
			case 'no_fix':
				session.status = 'failed';
				await this.sessions.save(session);
				return { status: 'failed', sessionId: session.id, reason: plan.fix.summary, diagnostics };
		}
	}

	/** Compiles a bundle of IR workflows; used by the fast-path compile API and tests. */
	async compileBundle(
		workflows: WorkflowIR[],
	): Promise<Array<{ ir: WorkflowIR; result: CompilerResult }>> {
		const bundleIssues = validateBundleIr({ workflows, dependencies: [] });
		const results: Array<{ ir: WorkflowIR; result: CompilerResult }> = [];
		for (const ir of workflows) {
			const session = await this.loadOrStart('create', ir.name, undefined, undefined);
			session.ir = ir;
			const own = bundleIssues.filter((issue) => issue.workflowId === ir.id);
			if (own.length > 0) {
				session.status = 'failed';
				results.push({
					ir,
					result: {
						status: 'failed',
						sessionId: session.id,
						reason: own.map((issue) => issue.message).join(' '),
						diagnostics: this.diagnostics(session),
					},
				});
				continue;
			}
			results.push({ ir, result: await this.compileSession(session, ir) });
		}
		return results;
	}

	// ── internals ──────────────────────────────────────────────────────────

	private async loadOrStart(
		intent: Intent,
		request: string,
		sessionId: string | undefined,
		workflowId?: string,
	): Promise<GenerationSession> {
		if (sessionId) {
			const existing = await this.sessions.get(sessionId);
			if (existing) return existing;
		}
		const timestamp = this.now().toISOString();
		const session: GenerationSession = {
			id: `gen_${nanoid(10)}`,
			intent,
			request,
			messages: [request],
			requirements: extractRequirements(request),
			status: 'understanding_request',
			unresolved: [],
			questions: [],
			...(workflowId ? { workflowId } : {}),
			decisions: [],
			timings: {},
			planningPath: intent === 'edit' ? 'patch' : intent === 'debug' ? 'debug' : 'fast',
			createdAt: timestamp,
			updatedAt: timestamp,
		};
		session.requirements.intent = resolved(intent, 'user');
		return session;
	}

	/** Applies clarification answers to pending requirement fields; a lone free-text reply fills a single pending question. */
	private applyAnswers(
		session: GenerationSession,
		answers: Record<string, unknown> | undefined,
		message?: string,
	): void {
		const requirements = session.requirements;
		const pending = session.unresolved.map((issue) => issue.field);
		const assign = (field: string, value: unknown) => setRequirement(requirements, field, value);
		for (const [field, value] of Object.entries(answers ?? {})) assign(field, value);
		if (message && pending.length === 1 && answers?.[pending[0]] === undefined) {
			assign(pending[0], inferAnswerValue(pending[0], message));
		}
		session.unresolved = [];
		session.questions = [];
	}

	private async clarify(
		session: GenerationSession,
		issues: RequirementIssue[],
		questions: ClarificationQuestion[],
	): Promise<CompilerResult> {
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

	private async compileSession(
		session: GenerationSession,
		ir: WorkflowIR,
	): Promise<CompilerResult> {
		const irIssues = validateWorkflowIr(ir);
		if (irIssues.length > 0) {
			session.status = 'failed';
			await this.sessions.save(session);
			return {
				status: 'failed',
				sessionId: session.id,
				reason: `IR validation failed: ${irIssues.map((issue) => issue.message).join(' ')}`,
				diagnostics: this.diagnostics(session),
			};
		}
		session.status = 'compiling';
		const compileStarted = Date.now();
		let compiled;
		try {
			compiled = compileWorkflow(ir, this.registry);
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
		session.timings.compileMs = Date.now() - compileStarted;
		session.status = 'validating';
		const validateStarted = Date.now();
		const report = await validateCompiledWorkflow({ ir, compiled, registry: this.registry });
		session.timings.validateMs = Date.now() - validateStarted;
		session.compiled = {
			workflow: compiled.workflow,
			stepNodeNames: compiled.stepNodeNames,
			generator: compiled.generator,
		};
		session.report = report;
		return await this.finish(
			session,
			compiled.workflow,
			report,
			compiled.generator,
			ir,
			`Compiled "${compiled.workflow.name}" with ${compiled.workflow.nodes.length} nodes from ${ir.patternIds.length} pattern(s).`,
			[],
		);
	}

	private async applyPatchSet(
		session: GenerationSession,
		workflow: WorkflowJSON,
		patches: WorkflowPatch[],
		summary: string,
	): Promise<CompilerResult> {
		session.status = 'compiling';
		let patched: WorkflowJSON;
		try {
			patched = applyPatches(workflow, patches);
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
		session.status = 'validating';
		const report = emptyVerificationReport();
		const structural = validateStructure(patched);
		report.structural = levelFor(structural);
		const expressions = validateExpressions(patched);
		report.expressions = levelFor(expressions);
		report.issues.push(...structural, ...expressions);
		const generator: GeneratorMetadata = {
			compilerVersion: COMPILER_VERSION,
			patternRegistryVersion: this.patterns.version,
			nodeRegistryVersion: this.registry.version,
			schemaVersion: '1',
			patternIds: [],
		};
		session.compiled = { workflow: patched, stepNodeNames: {}, generator };
		session.report = report;
		return await this.finish(session, patched, report, generator, undefined, summary, [
			...affectedNodeNames(patches),
		]);
	}

	private async finish(
		session: GenerationSession,
		workflow: WorkflowJSON,
		report: VerificationReport,
		generator: GeneratorMetadata,
		ir: WorkflowIR | undefined,
		summary: string,
		changedNodeNames: string[],
	): Promise<CompilerResult> {
		session.updatedAt = this.now().toISOString();
		if (hasBlockingIssues(report)) {
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
		session.status = report.issues.some((issue) => issue.code === 'credential_unresolved')
			? 'compiled_with_unresolved_resources'
			: 'compiled';
		await this.sessions.save(session);
		return {
			status: 'compiled',
			sessionId: session.id,
			workflow,
			report,
			generator,
			...(ir ? { ir } : {}),
			executionPaths: enumerateExecutionPaths(workflow),
			summary,
			changedNodeNames,
			diagnostics: this.diagnostics(session),
		};
	}

	private diagnostics(session: GenerationSession): CompilerDiagnostics {
		return {
			sessionId: session.id,
			planningPath: session.planningPath,
			decisionCount: session.decisions.reduce(
				(total, entry) => total + entry.questionNames.length,
				0,
			),
			decisionWaves: session.decisions.length,
			decisionLatencyMs: session.decisions.reduce((total, entry) => total + entry.latencyMs, 0),
			timings: { ...session.timings },
			compilerVersion: COMPILER_VERSION,
			decisions: session.decisions,
		};
	}
}

/** Writes a clarification answer into the requirement state by field path. */
export function setRequirement(requirements: Requirements, field: string, value: unknown): void {
	if (
		field === 'intent' ||
		field === 'trigger' ||
		field === 'workflowName' ||
		field === 'errorPolicy'
	) {
		requirements[field] = resolved(value, 'user');
		return;
	}
	if (field.startsWith('triggerParams.')) {
		requirements.triggerParams[field.slice('triggerParams.'.length)] = resolved(value, 'user');
		return;
	}
	const actionMatch = field.match(/^actions\.([^.]+)\.(.+)$/);
	if (actionMatch) {
		const action = requirements.actions.find((candidate) => candidate.id === actionMatch[1]);
		if (action) {
			if (actionMatch[2] === 'operation')
				action.operationId = typeof value === 'string' ? value : action.operationId;
			else action.params[actionMatch[2]] = value;
		}
	}
	if (field === 'actions' && typeof value === 'string') {
		const extracted = extractRequirements(value);
		requirements.actions.push(...extracted.actions);
	}
	requirements.answers[field] = value;
}

/** Best-effort value for a lone free-text reply to one pending question. */
function inferAnswerValue(field: string, message: string): unknown {
	const trimmed = message.trim();
	if (/channel$/.test(field)) return trimmed.match(/#[a-z0-9_-]+/i)?.[0] ?? trimmed;
	if (/\.(method)$/.test(field))
		return (
			trimmed.match(/\b(GET|POST|PUT|PATCH|DELETE)\b/i)?.[1]?.toUpperCase() ?? trimmed.toUpperCase()
		);
	if (/\.(path)$/.test(field)) return trimmed.match(/\/?[a-z0-9_\-/{}:]+/i)?.[0] ?? trimmed;
	if (field === 'trigger') {
		if (/\b(webhook|endpoint|api|http)\b/i.test(trimmed)) return 'webhook';
		if (/\b(schedule|cron|every|daily|nightly|hourly)\b/i.test(trimmed)) return 'schedule';
		if (/\b(manual|click|by hand)\b/i.test(trimmed)) return 'manual';
	}
	return trimmed;
}
