/**
 * Three-way reconciliation engine (LIGO-819 POC).
 *
 * TypeScript port of `.context/ligo-819/reconcile-poc/reconcile.mjs`. Pure logic
 * over packages (path -> resource, path = stable resource id) per decisions
 * D002 / D003 / D006 / D007 / D009. The service layer supplies `base`/`head`
 * from git commits, `live` from the instance, and (optionally) the two
 * name-status diffs computed by real `git diff` (D006); `classify` below is the
 * in-memory reference implementation of the same comparison.
 */
import { canon } from './canonical-json';
import type {
	ChangeStatus,
	ConflictPolicy,
	ConflictReason,
	Decision,
	Package,
	ReconcileOptions,
	ReconcileResult,
	ScopeRole,
	SideStatus,
} from './types';

/**
 * Classify one side against base: per-path 'A' | 'M' | 'D', unchanged paths
 * omitted. Content-based (≙ `git diff --name-status base..side`), so an
 * identical edit on both sides diffs clean and never becomes a false conflict.
 */
export function classify(base: Package, side: Package): Map<string, ChangeStatus> {
	const status = new Map<string, ChangeStatus>();
	for (const path of new Set([...Object.keys(base), ...Object.keys(side)])) {
		const inBase = path in base;
		const inSide = path in side;
		if (inBase && !inSide) status.set(path, 'D');
		else if (!inBase && inSide) status.set(path, 'A');
		else if (canon(base[path]) !== canon(side[path])) status.set(path, 'M');
	}
	return status;
}

// D007 guardrail: resolving this conflict toward git would destroy
// locally-modified work; it never auto-resolves, even under `mirror`.
const DESTRUCTIVE_TO_LIVE: ConflictReason = 'git-deleted-live-modified';

interface DecideContext {
	head: Package;
	live: Package;
	role: ScopeRole;
	editable: boolean;
	policy: ConflictPolicy;
	choices?: Record<string, 'head' | 'live'>;
	isDeletionExempt?: (path: string) => boolean;
}

function decide(path: string, g: SideStatus, l: SideStatus, ctx: DecideContext): Decision {
	const { head, live } = ctx;
	const headHas = path in head;
	const liveHas = path in live;

	// Content convergence short-circuit (D006): if both sides ended at identical
	// content, there is nothing to do regardless of how they got there.
	if (headHas && liveHas && canon(head[path]) === canon(live[path])) {
		return { path, g, l, kind: 'converged', note: 'both sides identical' };
	}
	if (!headHas && !liveHas) {
		return { path, g, l, kind: 'converged', op: 'delete', note: 'deleted on both sides' };
	}

	// Live-only change → outgoing (source) or local override (destination).
	if (g === 'U' && l !== 'U') {
		const op = l === 'D' ? 'delete' : l === 'A' ? 'create' : 'modify';
		return liveOnly(path, g, l, op, ctx);
	}

	// Git-only change → apply head's version to live.
	if (l === 'U' && g !== 'U') {
		if (g === 'D' && ctx.isDeletionExempt?.(path)) {
			return { path, g, l, kind: 'skipped', op: 'delete', note: 'deletion-exempt (credential)' };
		}
		const op = g === 'D' ? 'delete' : g === 'A' ? 'create' : 'update';
		return { path, g, l, kind: 'apply-to-live', op };
	}

	// Both sides touched the resource → conflict. Reason names the exact pair.
	const reason: ConflictReason =
		g === 'M' && l === 'M'
			? 'both-modified'
			: g === 'M' && l === 'D'
				? 'git-modified-live-deleted'
				: g === 'D' && l === 'M'
					? DESTRUCTIVE_TO_LIVE
					: 'both-added-diverged'; // g === 'A' && l === 'A'
	return resolveConflict(path, g, l, reason, ctx);
}

function liveOnly(
	path: string,
	g: SideStatus,
	l: SideStatus,
	op: NonNullable<Decision['op']>,
	ctx: DecideContext,
): Decision {
	if (ctx.role === 'source') return { path, g, l, kind: 'outgoing', op };
	// destination
	if (ctx.editable) return { path, g, l, kind: 'keep-live-override', op };
	return { path, g, l, kind: 'reset-to-head', op, note: 'read-only destination discards live' };
}

function resolveConflict(
	path: string,
	g: SideStatus,
	l: SideStatus,
	reason: ConflictReason,
	ctx: DecideContext,
): Decision {
	const { role, editable, policy, choices, isDeletionExempt } = ctx;
	const conflict: Decision = { path, g, l, kind: 'conflict', reason };

	// An explicit per-path choice beats the policy. Choosing 'head' may delete
	// live-modified work: D007 forbids *silent* deletion — the choice is the surfacing.
	const choice = choices?.[path];
	if (choice === 'head') {
		if (g === 'D' && isDeletionExempt?.(path)) {
			return {
				...conflict,
				resolved: 'head',
				kind: 'skipped',
				note: 'deletion-exempt (credential)',
			};
		}
		const op = g === 'D' ? 'delete' : 'update';
		return { ...conflict, resolved: 'head', kind: 'apply-to-live', op };
	}
	if (choice === 'live') return resolveToLive(conflict, l, role, editable);

	if (policy === 'manual') return { ...conflict, resolved: false };

	if (policy === 'mirror') {
		// git wins — but never auto-delete locally-modified work (D007 keep-bias).
		if (reason === DESTRUCTIVE_TO_LIVE) {
			return { ...conflict, resolved: false, note: 'mirror blocked: would delete live-modified' };
		}
		if (g === 'D' && isDeletionExempt?.(path)) {
			return {
				...conflict,
				resolved: 'head',
				kind: 'skipped',
				note: 'deletion-exempt (credential)',
			};
		}
		const op = g === 'D' ? 'delete' : 'update'; // git-deleted here only for non-destructive combos
		return { ...conflict, resolved: 'head', kind: 'apply-to-live', op };
	}

	// keep-live — instance version wins.
	return resolveToLive(conflict, l, role, editable);
}

function resolveToLive(
	conflict: Decision,
	l: SideStatus,
	role: ScopeRole,
	editable: boolean,
): Decision {
	const op = l === 'D' ? 'delete' : l === 'A' ? 'create' : 'modify';
	if (role === 'source') return { ...conflict, resolved: 'live', kind: 'outgoing', op };
	if (editable) return { ...conflict, resolved: 'live', kind: 'keep-live-override', op };
	return { ...conflict, resolved: 'head', kind: 'reset-to-head' };
}

/** Mutate the running result packages to reflect one decision. */
function applyDecision(
	d: Decision,
	head: Package,
	live: Package,
	resultingLive: Package,
	resultingHead: Package,
): void {
	switch (d.kind) {
		case 'apply-to-live':
		case 'reset-to-head':
			if (d.op === 'delete') delete resultingLive[d.path];
			else resultingLive[d.path] = head[d.path];
			break;
		case 'outgoing':
			if (d.op === 'delete') delete resultingHead[d.path];
			else resultingHead[d.path] = live[d.path];
			break;
		case 'keep-live-override':
		case 'converged':
		case 'conflict':
		case 'deferred':
		case 'skipped':
			// live already holds its version; head untouched. Unresolved conflicts block.
			break;
	}
}

export function reconcile(
	base: Package,
	head: Package,
	live: Package,
	opts: ReconcileOptions,
): ReconcileResult {
	const ctx: DecideContext = {
		head,
		live,
		role: opts.role,
		editable: opts.editable ?? true,
		policy: opts.policy ?? 'manual',
		choices: opts.choices,
		isDeletionExempt: opts.isDeletionExempt,
	};

	const gitDiff = opts.gitDiff ?? classify(base, head);
	const liveDiff = opts.liveDiff ?? classify(base, live);
	const selected = opts.select ? new Set(opts.select) : null;

	const paths = [...new Set([...gitDiff.keys(), ...liveDiff.keys()])].sort();
	const resultingLive = { ...live };
	const resultingHead = { ...head };
	const decisions: Decision[] = [];

	for (const path of paths) {
		const g = gitDiff.get(path) ?? 'U';
		const l = liveDiff.get(path) ?? 'U';
		let d = decide(path, g, l, ctx);
		// Partial apply (D009): unselected paths stay available; nothing is applied
		// for them and base must not advance past what was actually applied.
		if (selected && !selected.has(path) && d.kind !== 'converged') {
			d = {
				path,
				g,
				l,
				kind: 'deferred',
				note: `deferred: would ${d.kind}${d.op ? ` (${d.op})` : ''}`,
			};
		}
		applyDecision(d, head, live, resultingLive, resultingHead);
		decisions.push(d);
	}

	const blocked = decisions.filter((d) => d.kind === 'conflict' && d.resolved === false);
	const outgoing = decisions.filter((d) => d.kind === 'outgoing');
	const deferred = decisions.filter((d) => d.kind === 'deferred');

	return {
		decisions,
		resultingLive,
		resultingHead,
		blocked,
		outgoing,
		deferred,
		pushBlocked: opts.role === 'source' && blocked.length > 0,
		baseAdvances: blocked.length === 0 && !selected,
	};
}
