/**
 * Executor — deterministic checklist walker. NOT an LLM.
 *
 * For each pending checklist item it spawns a fresh Specialist agent
 * (clean context per item). After each item it decides whether to surface
 * a check-in to the user. The rule is: only ask about decisions the user
 * would actually want a say in.
 *
 *  - confidence == "high"           → keep building (user watches the canvas)
 *  - confidence == "medium" / "low" → ask the user with the question + options
 *                                     the specialist itself authored; propagate
 *                                     any feedback to remaining items
 *  - specialist threw an error      → ask retry / skip / abort
 *  - all done                       → final commit + verify
 *
 * There is no periodic "does this look right?" checkpoint — generic check-ins
 * make the user dissociate. Every check-in must be about a specific decision.
 */

import type { IncChecklistItem } from '@n8n/api-types';

import type { BackendSyncer } from './backend-sync';
import type { ChecklistStore } from './checklist-store';
import type { DraftStore } from './draft-store';
import type { EventChannel } from './event-helpers';
import { publishPhase, publishStatus } from './event-helpers';
import type { HitlBroker } from './hitl-broker';
import type { NodeContext } from './node-context';
import { runSpecialist } from './agents/specialist';

export interface ExecutorOptions {
	model: string;
	fastModel?: string;
	draft: DraftStore;
	checklist: ChecklistStore;
	broker: HitlBroker;
	channel: EventChannel;
	nodeContext: NodeContext;
	intentBrief: string;
	syncer?: BackendSyncer;
}

export interface ExecutorResult {
	completed: boolean;
	itemsCompleted: number;
	itemsBlocked: number;
}

export async function runExecutor(opts: ExecutorOptions): Promise<ExecutorResult> {
	publishPhase(opts.channel, 'building', 'Building workflow node-by-node');

	let totalCompleted = 0;
	let totalBlocked = 0;

	// Safety cap so a runaway plan can't loop forever.
	const maxIterations = opts.checklist.get().items.length * 3 + 10;
	let iterations = 0;

	while (iterations < maxIterations) {
		iterations += 1;
		const next = opts.checklist.findNextPending();
		if (!next) break;

		if (next.kind === 'verify') {
			// Verification is driven by the orchestrator after the executor finishes,
			// not by a specialist. Mark it done here and let the caller handle it.
			opts.checklist.setStatus(next.id, 'done', 'Verifier will run after build');
			break;
		}

		opts.checklist.setStatus(next.id, 'in_progress');
		publishStatus(opts.channel, `Working on: ${next.title}`);

		let specialistResult;
		try {
			specialistResult = await runSpecialist({
				model: opts.model,
				draft: opts.draft,
				nodeContext: opts.nodeContext,
				channel: opts.channel,
				context: {
					item: next,
					intentBrief: opts.intentBrief,
					priorNodes: opts.draft.getNodeSummaries(),
				},
			});
		} catch (error) {
			const note = error instanceof Error ? error.message : String(error);
			opts.checklist.updateItem(next.id, { status: 'failed', note });
			totalBlocked += 1;

			const decision = await askUserAfterFailure(opts, next, note);
			if (decision === 'abort') break;
			if (decision === 'skip') continue;
			// 'retry' → rewind status and loop again
			opts.checklist.setStatus(next.id, 'pending');
			continue;
		}

		opts.checklist.updateItem(next.id, {
			status: 'done',
			confidence: specialistResult.confidence,
			...(specialistResult.notes !== undefined && { note: specialistResult.notes }),
		});
		totalCompleted += 1;

		// Push the draft mutation(s) made during this specialist run to the real
		// workflow so the canvas iframe refreshes. Errors here are non-fatal —
		// the in-memory draft is still the source of truth.
		if (opts.syncer) {
			await opts.syncer.sync(opts.draft).catch(() => undefined);
		}

		// Surface a check-in any time the specialist wasn't fully confident in
		// the decision it made. "high" → silent, the canvas tells the story.
		// "medium" / "low" → use the question + options the specialist itself
		// authored. The executor adds no wording of its own.
		if (
			specialistResult.confidence !== 'high' &&
			specialistResult.userCheckIn &&
			!opts.checklist.allTerminal()
		) {
			const decision = await askUserOnUncertainStep(opts, next, specialistResult);
			if (decision === 'undo') {
				opts.checklist.setStatus(next.id, 'pending', 'User requested rework');
				continue;
			}
			if (decision === 'abort') break;
		}
	}

	return {
		completed: opts.checklist.allTerminal(),
		itemsCompleted: totalCompleted,
		itemsBlocked: totalBlocked,
	};
}

async function askUserOnUncertainStep(
	opts: ExecutorOptions,
	item: IncChecklistItem,
	specialistResult: {
		confidence: 'high' | 'medium' | 'low';
		rationale: string;
		notes?: string;
		userCheckIn?: { question: string; options: Array<{ label: string }> };
	},
): Promise<'keep' | 'undo' | 'abort'> {
	if (!specialistResult.userCheckIn) {
		// Defensive: caller guards on userCheckIn, so this is unreachable. We
		// continue silently rather than inventing a question — there are no
		// default check-in questions in this system.
		return 'keep';
	}

	const intro = [
		`Why: ${specialistResult.rationale}`,
		specialistResult.notes ? `Notes: ${specialistResult.notes}` : '',
	]
		.filter(Boolean)
		.join('\n');

	const options = specialistResult.userCheckIn.options.map((o, i) => ({
		id: `opt_${i}`,
		label: o.label,
	}));

	const response = await opts.broker.requestChoice({
		question: specialistResult.userCheckIn.question,
		intro,
		options,
		allowFreeText: true,
		severity: specialistResult.confidence === 'low' ? 'warning' : 'info',
	});

	if (response.cancelled) return 'keep';

	// Free-text feedback is steering — record it on the current item AND
	// propagate it to every remaining pending item so subsequent specialists
	// see the steering signal.
	if (response.freeText && response.freeText.trim().length > 0) {
		const feedback = response.freeText.trim();
		opts.checklist.updateItem(item.id, { note: feedback });
		propagateFeedback(opts, feedback);
		return 'undo';
	}

	// The user picked one of the specialist-authored options. If they picked
	// the "(Recommended)" one — the one that matches what was built — we
	// keep going. Otherwise we record their pick as steering feedback and
	// redo the step.
	const picked = options.find((o) => o.id === response.choiceId);
	if (!picked) return 'keep';
	if (isRecommendedLabel(picked.label)) return 'keep';

	const feedback = `User chose: ${stripRecommendedSuffix(picked.label)}`;
	opts.checklist.updateItem(item.id, { note: feedback });
	propagateFeedback(opts, feedback);
	return 'undo';
}

function isRecommendedLabel(label: string): boolean {
	return /\(\s*recommended\s*\)\s*$/i.test(label);
}

function stripRecommendedSuffix(label: string): string {
	return label.replace(/\s*\(\s*recommended\s*\)\s*$/i, '').trim();
}

/**
 * Push a user-feedback string onto every remaining pending checklist item so
 * the specialist agents that handle them see the steering signal. This is
 * how "continuously adjust the plan/prompts" is implemented — instead of
 * re-planning, we enrich the per-item briefing each specialist already reads.
 */
function propagateFeedback(opts: ExecutorOptions, feedback: string): void {
	for (const item of opts.checklist.get().items) {
		if (item.status !== 'pending' && item.status !== 'needs_user') continue;
		const merged = item.note ? `${item.note}\n${feedback}` : feedback;
		opts.checklist.updateItem(item.id, { note: merged });
	}
}

async function askUserAfterFailure(
	opts: ExecutorOptions,
	item: IncChecklistItem,
	error: string,
): Promise<'retry' | 'skip' | 'abort'> {
	const response = await opts.broker.requestChoice({
		question: `Step "${item.title}" failed. What now?`,
		intro: error,
		options: [
			{ id: 'retry', label: 'Retry this step (Recommended)' },
			{ id: 'skip', label: 'Skip and continue' },
			{ id: 'abort', label: 'Stop building' },
		],
		allowFreeText: true,
		severity: 'destructive',
	});
	if (response.cancelled) return 'abort';

	// Free-text feedback is steering — attach to the item so the retry sees it.
	if (response.freeText && response.freeText.trim().length > 0) {
		opts.checklist.updateItem(item.id, { note: response.freeText.trim() });
		return 'retry';
	}

	if (response.choiceId === 'retry') return 'retry';
	if (response.choiceId === 'skip') return 'skip';
	return 'abort';
}
