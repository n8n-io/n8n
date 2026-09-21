import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
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
import { planDebug } from './modes/debug';
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
import {
	fromPersisted,
	InMemorySessionStore,
	type GenerationSession,
	type GeneratorStatus,
	type SessionStore,
} from './session/session';
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

export type CompilerResult = { sessionId: string; diagnostics: CompilerDiagnostics } & (
	| {
			status: 'needs_clarification';
			questions: ClarificationQuestion[];
			message: string;
			unresolved: RequirementIssue[];
	  }
	| {
			status: 'compiled';
			workflow: WorkflowJSON;
			report: VerificationReport;
			generator: GeneratorMetadata;
			ir?: WorkflowIR;
			executionPaths: ExecutionPath[];
			summary: string;
			/** Nodes an edit or debug patch touched; empty for a fresh build. */
			changedNodeNames: string[];
	  }
	| { status: 'needs_setup'; summary: string; credentialTypes: string[] }
	| { status: 'failed'; reason: string; report?: VerificationReport }
);

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

/** Orchestrates requirements → bounded decisions → IR → compile → validation; only the decision service touches a model. */
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
		const session = await this.loadOrStart('create', input.request, input);
		const resumed = Boolean(input.sessionId) && session.id === input.sessionId;
		if (resumed) session.messages.push(input.request);
		else {
			session.requirements = extractRequirements(input.request);
			session.requirements.intent = resolved('create', 'user');
		}
		this.applyAnswers(session, input.answers, resumed ? input.request : undefined);
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
		if (plan.status === 'needs_clarification') return await this.clarify(session, plan.issues);
		session.ir = plan.ir;
		return await this.compileSession(session, plan.ir);
	}

	async edit(input: EditRequest): Promise<CompilerResult> {
		const started = Date.now();
		const session = await this.loadOrStart('edit', input.request, input);
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
		if (plan.status === 'needs_clarification') return await this.clarify(session, plan.issues);
		return await this.applyPatchSet(session, input.workflow, plan.patches, plan.summary);
	}

	async debug(input: DebugRequest): Promise<CompilerResult> {
		const started = Date.now();
		const { workflow, execution, request } = input;
		const label = request ?? `Debug execution ${execution.executionId ?? ''}`.trim();
		const session = await this.loadOrStart('debug', label, input);
		session.planningPath = 'debug';
		const { diagnosis, fix } = planDebug({ workflow, execution, request, registry: this.registry });
		session.timings.planningMs = Date.now() - started;
		switch (fix.kind) {
			case 'patch': {
				const summary = `${fix.summary} Diagnosis: ${diagnosis.failureClass}.`;
				return await this.applyPatchSet(session, workflow, fix.patches, summary);
			}
			case 'setup': {
				const diagnostics = await this.save(session, 'compiled_with_unresolved_resources');
				const { summary, credentialTypes } = fix;
				const sessionId = session.id;
				return { status: 'needs_setup', sessionId, summary, credentialTypes, diagnostics };
			}
			case 'needs_user_input': {
				const field = `debug.${diagnosis.failedNode ?? 'workflow'}`;
				return await this.clarify(session, [
					{ field, reason: fix.summary, question: fix.question },
				]);
			}
			case 'no_fix':
				return await this.fail(session, fix.summary);
		}
	}

	/** Compiles a bundle of IR workflows; used by the fast-path compile API and tests. */
	async compileBundle(
		workflows: WorkflowIR[],
	): Promise<Array<{ ir: WorkflowIR; result: CompilerResult }>> {
		const bundleIssues = validateBundleIr({ workflows, dependencies: [] });
		const results: Array<{ ir: WorkflowIR; result: CompilerResult }> = [];
		for (const ir of workflows) {
			const session = await this.loadOrStart('create', ir.name, {});
			session.ir = ir;
			const own = bundleIssues.filter((issue) => issue.workflowId === ir.id);
			if (own.length > 0) {
				// A bundle-level failure is reported without persisting the session.
				const reason = own.map((issue) => issue.message).join(' ');
				results.push({ ir, result: await this.fail(session, reason, { persist: false }) });
			} else results.push({ ir, result: await this.compileSession(session, ir) });
		}
		return results;
	}

	// ── internals ──────────────────────────────────────────────────────────

	private async loadOrStart(
		intent: Intent,
		request: string,
		input: { sessionId?: string; workflowId?: string },
	): Promise<GenerationSession> {
		const existing = input.sessionId ? await this.sessions.get(input.sessionId) : undefined;
		if (existing) return existing;
		const timestamp = this.now().toISOString();
		const session = fromPersisted({
			id: `gen_${nanoid(10)}`,
			intent,
			request,
			messages: [request],
			requirements: extractRequirements(request),
			status: 'understanding_request',
			...(input.workflowId ? { workflowId: input.workflowId } : {}),
			createdAt: timestamp,
			updatedAt: timestamp,
		});
		session.requirements.intent = resolved(intent, 'user');
		return session;
	}

	/** Applies clarification answers to pending requirement fields; a lone free-text reply fills a single pending question. */
	private applyAnswers(
		session: GenerationSession,
		answers: Record<string, unknown> | undefined,
		message?: string,
	): void {
		const pending = session.unresolved.map((issue) => issue.field);
		for (const [field, value] of Object.entries(answers ?? {})) {
			setRequirement(session.requirements, field, value);
		}
		if (message && pending.length === 1 && answers?.[pending[0]] === undefined) {
			setRequirement(session.requirements, pending[0], inferAnswerValue(pending[0], message));
		}
		session.unresolved = [];
		session.questions = [];
	}

	private async clarify(
		session: GenerationSession,
		unresolved: RequirementIssue[],
		questions = buildClarificationQuestions(unresolved),
	): Promise<CompilerResult> {
		session.unresolved = unresolved;
		session.questions = questions;
		session.updatedAt = this.now().toISOString();
		const diagnostics = await this.save(session, 'needs_clarification');
		const sessionId = session.id;
		const message = formatClarification(questions);
		return {
			status: 'needs_clarification',
			sessionId,
			questions,
			message,
			unresolved,
			diagnostics,
		};
	}

	private async compileSession(
		session: GenerationSession,
		ir: WorkflowIR,
	): Promise<CompilerResult> {
		const irIssues = validateWorkflowIr(ir);
		if (irIssues.length > 0) {
			const reason = `IR validation failed: ${irIssues.map((issue) => issue.message).join(' ')}`;
			return await this.fail(session, reason);
		}
		session.status = 'compiling';
		const compileStarted = Date.now();
		let compiled: ReturnType<typeof compileWorkflow>;
		try {
			compiled = compileWorkflow(ir, this.registry);
		} catch (error) {
			return await this.fail(session, getErrorMessage(error));
		}
		session.timings.compileMs = Date.now() - compileStarted;
		session.status = 'validating';
		const validateStarted = Date.now();
		const report = await validateCompiledWorkflow({ ir, compiled, registry: this.registry });
		session.timings.validateMs = Date.now() - validateStarted;
		const { workflow, stepNodeNames, generator } = compiled;
		session.compiled = { workflow, stepNodeNames, generator };
		session.report = report;
		const summary = `Compiled "${workflow.name}" with ${workflow.nodes.length} nodes from ${ir.patternIds.length} pattern(s).`;
		return await this.finish(session, workflow, report, generator, ir, summary, []);
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
			return await this.fail(session, getErrorMessage(error));
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
		const changed = [...affectedNodeNames(patches)];
		return await this.finish(session, patched, report, generator, undefined, summary, changed);
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
			const errors = report.issues.filter((issue) => issue.severity === 'error');
			return await this.fail(session, errors.map((issue) => issue.message).join(' '), { report });
		}
		const unresolved = report.issues.some((issue) => issue.code === 'credential_unresolved');
		const status = unresolved ? 'compiled_with_unresolved_resources' : 'compiled';
		const diagnostics = await this.save(session, status);
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
			diagnostics,
		};
	}

	/** Sets the final status, persists the session and returns its diagnostics. */
	private async save(
		session: GenerationSession,
		status: GeneratorStatus,
	): Promise<CompilerDiagnostics> {
		session.status = status;
		await this.sessions.save(session);
		return this.diagnostics(session);
	}

	private async fail(
		session: GenerationSession,
		reason: string,
		{ report, persist = true }: { report?: VerificationReport; persist?: boolean } = {},
	): Promise<CompilerResult> {
		session.status = 'failed';
		if (persist) await this.sessions.save(session);
		const sessionId = session.id;
		const diagnostics = this.diagnostics(session);
		return { status: 'failed', sessionId, reason, ...(report ? { report } : {}), diagnostics };
	}

	private diagnostics(session: GenerationSession): CompilerDiagnostics {
		const { decisions } = session;
		return {
			sessionId: session.id,
			planningPath: session.planningPath,
			decisionCount: decisions.reduce((total, entry) => total + entry.questionNames.length, 0),
			decisionWaves: decisions.length,
			decisionLatencyMs: decisions.reduce((total, entry) => total + entry.latencyMs, 0),
			timings: { ...session.timings },
			compilerVersion: COMPILER_VERSION,
			decisions,
		};
	}
}

const DIRECT_FIELDS = ['intent', 'trigger', 'workflowName', 'errorPolicy'] as const;

/** Writes a clarification answer into the requirement state by field path. */
export function setRequirement(requirements: Requirements, field: string, value: unknown): void {
	const direct = DIRECT_FIELDS.find((name) => name === field);
	if (direct) {
		requirements[direct] = resolved(value, 'user');
		return;
	}
	if (field.startsWith('triggerParams.')) {
		requirements.triggerParams[field.slice('triggerParams.'.length)] = resolved(value, 'user');
		return;
	}
	const actionMatch = field.match(/^actions\.([^.]+)\.(.+)$/);
	const action = requirements.actions.find((candidate) => candidate.id === actionMatch?.[1]);
	if (actionMatch && action) {
		if (actionMatch[2] === 'operation') {
			action.operationId = typeof value === 'string' ? value : action.operationId;
		} else action.params[actionMatch[2]] = value;
	}
	if (field === 'actions' && typeof value === 'string') {
		requirements.actions.push(...extractRequirements(value).actions);
	}
	requirements.answers[field] = value;
}

/** Best-effort value for a lone free-text reply to one pending question. */
function inferAnswerValue(field: string, message: string): unknown {
	const trimmed = message.trim();
	if (/channel$/.test(field)) return trimmed.match(/#[a-z0-9_-]+/i)?.[0] ?? trimmed;
	if (/\.(method)$/.test(field)) {
		const method = trimmed.match(/\b(GET|POST|PUT|PATCH|DELETE)\b/i)?.[1];
		return method?.toUpperCase() ?? trimmed.toUpperCase();
	}
	if (/\.(path)$/.test(field)) return trimmed.match(/\/?[a-z0-9_\-/{}:]+/i)?.[0] ?? trimmed;
	if (field === 'trigger') {
		if (/\b(webhook|endpoint|api|http)\b/i.test(trimmed)) return 'webhook';
		if (/\b(schedule|cron|every|daily|nightly|hourly)\b/i.test(trimmed)) return 'schedule';
		if (/\b(manual|click|by hand)\b/i.test(trimmed)) return 'manual';
	}
	return trimmed;
}
