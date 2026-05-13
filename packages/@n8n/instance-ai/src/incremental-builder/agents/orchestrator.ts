/**
 * Orchestrator — top-level glue for the incremental builder.
 *
 * Sequence:
 *   1. Intake  → ScopeSpec
 *   2. Planner → Checklist
 *   3. Plan approval (HITL) — with revision loop if the user wants changes
 *   4. Workflow shell created upfront so the canvas can open immediately
 *   5. Executor → walks checklist, surfaces low-confidence + hard checkpoints
 *   6. Verifier (clean context) → report
 *   7. If verifier finds blockers: re-open affected checklist items, loop
 *      once. Else: done.
 */

import type { IncChecklistItem, IncScopeSpec } from '@n8n/api-types';

import { BackendSyncer } from '../backend-sync';
import { ChecklistStore } from '../checklist-store';
import { DraftStore } from '../draft-store';
import { NodeContext } from '../node-context';
import type { EventChannel } from '../event-helpers';
import { publishPhase, publishStatus, publishVerifierReport } from '../event-helpers';
import { runExecutor } from '../executor';
import type { HitlBroker } from '../hitl-broker';
import type { IncrementalBuilderRunContext } from '../types';
import { runIntake } from './intake';
import { runPlanner } from './planner';
import { runVerifier } from './verifier';

const MAX_VERIFY_LOOPS = 1;

export interface OrchestratorOptions extends IncrementalBuilderRunContext {
	userMessage: string;
	broker: HitlBroker;
}

export interface OrchestratorResult {
	workflowId?: string;
	scope: IncScopeSpec;
	verifierVerdict: 'verified' | 'needs_changes' | 'failed' | 'skipped';
	verifierSummary?: string;
}

export async function runIncrementalOrchestrator(
	opts: OrchestratorOptions,
): Promise<OrchestratorResult> {
	const channel: EventChannel = {
		threadId: opts.threadId,
		runId: opts.runId,
		agentId: opts.agentId,
		...(opts.userId !== undefined && { userId: opts.userId }),
		eventBus: opts.eventBus,
	};

	// 1) Intake — ScopeSpec.
	const scope = await runIntake({
		model: opts.fastModel ?? opts.model,
		...(opts.fastModel !== undefined && { fastModel: opts.fastModel }),
		userMessage: opts.userMessage,
		broker: opts.broker,
		channel,
		maxRounds: opts.maxClarifyingRounds ?? 3,
	});

	// 2) Planner — Checklist.
	publishPhase(channel, 'planning', 'Drafting node-by-node plan');
	let items = await runPlanner({ model: opts.model, scope });

	const checklist = new ChecklistStore({
		threadId: opts.threadId,
		runId: opts.runId,
		agentId: opts.agentId,
		...(opts.userId !== undefined && { userId: opts.userId }),
		eventBus: opts.eventBus,
	});
	checklist.replace(items);

	// 3) Plan approval — with revision loop. If the user types feedback or
	// picks "change the plan", we re-run the planner with that feedback as
	// extra constraint and show the new plan. Caps at 2 revisions to avoid
	// infinite re-planning.
	publishPhase(channel, 'awaiting-plan-approval', 'Waiting for plan approval');
	const MAX_PLAN_REVISIONS = 2;
	let aborted = false;
	for (let revision = 0; revision <= MAX_PLAN_REVISIONS; revision++) {
		const decision = await askPlanApproval(opts.broker, items);
		if (decision.kind === 'approve') break;
		if (decision.kind === 'abort') {
			aborted = true;
			break;
		}
		if (revision === MAX_PLAN_REVISIONS) {
			// Out of revisions — proceed with what we have.
			break;
		}
		// Revise: feed the user's feedback into the planner and show the new plan.
		publishStatus(channel, 'Revising plan from your feedback');
		items = await runPlanner({
			model: opts.model,
			scope,
			revisionFeedback: decision.feedback,
			previousPlan: items,
		});
		checklist.replace(items);
	}
	if (aborted) {
		publishPhase(channel, 'blocked', 'Plan rejected');
		return { scope, verifierVerdict: 'skipped' };
	}

	// 4) Build the draft. Create the workflow shell upfront so the canvas
	//    iframe can open immediately — every executor step pushes the latest
	//    state via the syncer.
	const draft = new DraftStore({
		threadId: opts.threadId,
		runId: opts.runId,
		agentId: opts.agentId,
		...(opts.userId !== undefined && { userId: opts.userId }),
		eventBus: opts.eventBus,
		initialName: deriveWorkflowName(scope),
	});

	const syncer = new BackendSyncer({
		threadId: opts.threadId,
		runId: opts.runId,
		agentId: opts.agentId,
		...(opts.userId !== undefined && { userId: opts.userId }),
		eventBus: opts.eventBus,
		workflowService: opts.services.workflow,
		...(opts.projectId !== undefined && { projectId: opts.projectId }),
	});

	let workflowId: string;
	try {
		publishStatus(channel, 'Creating empty workflow');
		workflowId = await syncer.create(draft);
	} catch (error) {
		publishPhase(
			channel,
			'blocked',
			`Save failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		return { scope, verifierVerdict: 'failed', verifierSummary: 'Workflow save failed' };
	}

	const nodeContext = new NodeContext(opts.services.node);

	await runExecutor({
		model: opts.model,
		...(opts.fastModel !== undefined && { fastModel: opts.fastModel }),
		draft,
		checklist,
		broker: opts.broker,
		channel,
		nodeContext,
		intentBrief: scope.intentBrief,
		syncer,
	});

	if (draft.getState().nodes.length === 0) {
		publishPhase(channel, 'blocked', 'No nodes built');
		return {
			workflowId,
			scope,
			verifierVerdict: 'skipped',
			verifierSummary: 'Build aborted before any nodes were placed',
		};
	}

	// Final sync to ensure the saved workflow matches the in-memory draft.
	await syncer.sync(draft).catch(() => undefined);

	// 5) Verifier (clean context).
	publishPhase(channel, 'verifying', 'Independent verifier reviewing the workflow');
	let report = await runVerifier({
		model: opts.model,
		intentBrief: scope.intentBrief,
		workflow: draft.toWorkflowJSON(),
	});
	publishVerifierReport(channel, report);

	// 6) Feedback loop — re-open items for blocker-severity issues, run again.
	let verifyLoops = 0;
	while (
		report.verdict === 'needs_changes' &&
		report.issues.some((i) => i.severity === 'blocker') &&
		verifyLoops < MAX_VERIFY_LOOPS
	) {
		verifyLoops += 1;
		publishStatus(channel, `Applying verifier feedback (round ${verifyLoops})`);

		// Re-insert fix items for blocker-severity issues.
		for (const issue of report.issues.filter((i) => i.severity === 'blocker')) {
			checklist.insertItem({
				id: `fix_${Math.random().toString(36).slice(2, 8)}`,
				title: `Fix: ${issue.problem}`,
				intent:
					(issue.suggestedFix ? `${issue.suggestedFix}. ` : '') +
					`Root issue: ${issue.problem}` +
					(issue.nodeName ? ` (node: ${issue.nodeName})` : ''),
				kind: 'configure',
				deps: [],
				status: 'pending',
				verifierNote: issue.problem,
			});
		}

		await runExecutor({
			model: opts.model,
			...(opts.fastModel !== undefined && { fastModel: opts.fastModel }),
			draft,
			checklist,
			broker: opts.broker,
			channel,
			nodeContext,
			intentBrief: scope.intentBrief,
			syncer,
		});

		try {
			await syncer.sync(draft);
		} catch (error) {
			publishPhase(
				channel,
				'blocked',
				`Re-save failed: ${error instanceof Error ? error.message : String(error)}`,
			);
			break;
		}

		report = await runVerifier({
			model: opts.model,
			intentBrief: scope.intentBrief,
			workflow: draft.toWorkflowJSON(),
		});
		publishVerifierReport(channel, report);
	}

	if (report.verdict === 'verified') {
		await syncer.clearAiTemporary();
		publishPhase(channel, 'done', 'Workflow built and verified');
	} else {
		publishPhase(channel, 'blocked', `Verifier verdict: ${report.verdict}`);
	}

	return {
		workflowId,
		scope,
		verifierVerdict: report.verdict,
		verifierSummary: report.summary,
	};
}

function deriveWorkflowName(scope: IncScopeSpec): string {
	const candidate = scope.primaryAction.replace(/\s+/g, ' ').trim();
	return candidate.length > 0 ? candidate.slice(0, 80) : 'New AI Workflow';
}

type PlanDecision = { kind: 'approve' } | { kind: 'abort' } | { kind: 'revise'; feedback: string };

async function askPlanApproval(
	broker: HitlBroker,
	items: IncChecklistItem[],
): Promise<PlanDecision> {
	const summary = items.map((i, idx) => `${idx + 1}. ${i.title} — ${i.intent}`).join('\n');

	const response = await broker.requestChoice({
		question: 'Does this plan look right?',
		intro: `Proposed steps:\n${summary}`,
		options: [
			{ id: 'approve', label: 'Approve and start building (Recommended)' },
			{ id: 'revise', label: "I want to change something — I'll describe it" },
			{ id: 'abort', label: 'Stop, this is the wrong direction' },
		],
		allowFreeText: true,
		severity: 'info',
	});
	if (response.cancelled) return { kind: 'approve' };
	if (response.choiceId === 'abort') return { kind: 'abort' };

	// Free text always counts as revision feedback, regardless of which
	// option chip the user clicked first.
	if (response.freeText && response.freeText.trim().length > 0) {
		return { kind: 'revise', feedback: response.freeText.trim() };
	}
	if (response.choiceId === 'revise') {
		return { kind: 'revise', feedback: 'User asked to revise the plan but did not specify how.' };
	}
	return { kind: 'approve' };
}
