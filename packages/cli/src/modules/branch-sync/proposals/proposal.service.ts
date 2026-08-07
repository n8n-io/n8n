import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { BranchSyncStateService, projectIdOfScope } from '../branch-sync-state.service';
import type { ProposalState } from '../branch-sync-state.service';
import { BranchSyncService } from '../branch-sync.service';
import type { PreparedScope } from '../branch-sync.service';
import { reconcile } from '../engine/reconcile';
import type { Package } from '../engine/types';
import {
	authorCommit,
	commitTreeOf,
	EMPTY_TREE_SHA,
	isAncestor,
	readTreeFiles,
	revParse,
	stageLivePackage,
} from '../git/git-tree';
import { LiveSnapshotService } from '../live/live-snapshot.service';
import { parsePackageTree, serializePackage } from '../spec/projections';

/**
 * Feature branches as candidate heads (D004/D005). A proposal is its own git
 * object — "the changes the user wants in the target" — not a live-linked
 * snapshot of the instance. Three bookkeeping refs per proposal:
 *
 * - branch tip: the proposal content, always a real commit on origin
 * - masterFork: merge base vs the target; the REFRESH reconciliation's base
 * - liveFork: the last live⇄feature sync point; the UPDATE-FROM-LIVE base
 */
@Service()
export class ProposalService {
	constructor(
		private readonly stateService: BranchSyncStateService,
		private readonly branchSyncService: BranchSyncService,
		private readonly liveSnapshotService: LiveSnapshotService,
	) {}

	/**
	 * Create `proposal/<name>` = current head + the scope's outgoing live delta.
	 * Writes nothing to the instance and does not advance the scope's base.
	 */
	async create(scopeKey: string, name: string, choices?: Record<string, 'head' | 'live'>) {
		const prepared = await this.branchSyncService.prepare(scopeKey);
		const { state, git, dir, headSha } = prepared;
		if (state.proposals[name]) throw new ConflictError(`Proposal '${name}' already exists`);

		const ctx = await this.branchSyncService.buildPlan(prepared, { choices });
		if (ctx.result.blocked.length > 0) {
			throw new ConflictError(
				`Unresolved conflicts, resolve with choices first: ${ctx.result.blocked.map((d) => d.path).join(', ')}`,
			);
		}
		if (ctx.result.outgoing.length === 0) throw new BadRequestError('Nothing to propose');

		await stageLivePackage(git, dir, serializePackage(ctx.result.resultingHead));
		const tip = await authorCommit(git, {
			message: `n8n branch-sync: proposal ${name}`,
			parents: headSha ? [headSha] : [],
			targetBranch: `proposal/${name}`,
		});

		const proposal: ProposalState = {
			branch: `proposal/${name}`,
			masterFork: headSha ?? EMPTY_TREE_SHA,
			liveFork: tip,
			paths: ctx.result.outgoing.map((d) => d.path),
		};
		state.proposals[name] = proposal;
		await this.stateService.save(state);
		return { name, ...proposal, tip };
	}

	async status(scopeKey: string, name: string) {
		const prepared = await this.branchSyncService.prepare(scopeKey);
		const { proposal, tip } = await this.resolve(prepared, name);
		const behindTarget = prepared.headSha
			? !(await isAncestor(prepared.git, prepared.headSha, tip))
			: false;
		return {
			name,
			...proposal,
			tip,
			head: prepared.headSha,
			behindTarget,
			mergeable: !behindTarget,
		};
	}

	/**
	 * Refresh = the RECONCILIATION MERGE (D005): reconcile feature vs current
	 * head over the fork point, record the result as a true merge commit
	 * (parents = feature tip + head) whose tree n8n authored — never `git merge`.
	 * The original proposal commit stays an ancestor.
	 */
	async refresh(scopeKey: string, name: string, choices?: Record<string, 'head' | 'live'>) {
		const prepared = await this.branchSyncService.prepare(scopeKey);
		const { state, git, dir, headSha } = prepared;
		const { proposal, tip } = await this.resolve(prepared, name);
		if (!headSha || (await isAncestor(git, headSha, tip))) {
			return { name, refreshed: false, tip, note: 'already incorporates the target head' };
		}

		const basePkg = await this.readPackage(git, proposal.masterFork);
		const headPkg = await this.readPackage(git, headSha);
		const featurePkg = await this.readPackage(git, tip);

		// The feature plays the role live plays in a pull: 'source' makes the
		// engine fold feature-side changes into resultingHead = the merged content.
		const result = reconcile(basePkg, headPkg, featurePkg, { role: 'source', choices });
		if (result.blocked.length > 0) {
			return { name, refreshed: false, tip, conflicts: result.blocked };
		}

		await stageLivePackage(git, dir, serializePackage(result.resultingHead));
		const newTip = await authorCommit(git, {
			message: `n8n branch-sync: refresh ${name} onto ${headSha.slice(0, 12)}`,
			parents: [tip, headSha],
			targetBranch: proposal.branch,
		});
		proposal.masterFork = headSha;
		await this.stateService.save(state);
		return { name, refreshed: true, tip: newTip, decisions: result.decisions };
	}

	/**
	 * Fold newer live edits into the proposal (D004 update-from-live), restricted
	 * to the resources this proposal proposes so edits meant for another proposal
	 * are not swept in. Base = liveFork; advances liveFork to the new tip.
	 */
	async updateFromLive(scopeKey: string, name: string, choices?: Record<string, 'head' | 'live'>) {
		const prepared = await this.branchSyncService.prepare(scopeKey);
		const { state, git, dir } = prepared;
		const { proposal, tip } = await this.resolve(prepared, name);

		const basePkg = await this.readPackage(git, proposal.liveFork);
		const featurePkg = await this.readPackage(git, tip);
		const livePkg = await this.liveSnapshotService.snapshot(projectIdOfScope(state.scopeKey));

		const result = reconcile(basePkg, featurePkg, livePkg, {
			role: 'source',
			choices,
			select: proposal.paths,
		});
		if (result.blocked.length > 0) {
			return { name, updated: false, tip, conflicts: result.blocked };
		}
		if (result.outgoing.length === 0) {
			return { name, updated: false, tip, note: 'no live changes to fold in' };
		}

		await stageLivePackage(git, dir, serializePackage(result.resultingHead));
		const newTip = await authorCommit(git, {
			message: `n8n branch-sync: update ${name} from live`,
			parents: [tip],
			targetBranch: proposal.branch,
		});
		proposal.liveFork = newTip;
		await this.stateService.save(state);
		return { name, updated: true, tip: newTip, decisions: result.decisions };
	}

	/**
	 * Land the proposal on the target branch as ONE squashed commit — gated on
	 * the proposal incorporating the current head (D005 up-to-date gate).
	 */
	async merge(scopeKey: string, name: string) {
		const prepared = await this.branchSyncService.prepare(scopeKey);
		const { state, git, headSha } = prepared;
		const { proposal, tip } = await this.resolve(prepared, name);

		if (headSha && !(await isAncestor(git, headSha, tip))) {
			throw new ConflictError(
				'Proposal is behind the target branch — refresh required before merge',
			);
		}

		const merged = await commitTreeOf(git, {
			treeRef: tip,
			parents: headSha ? [headSha] : [],
			message: `n8n branch-sync: merge proposal ${name}`,
			targetBranch: state.branch,
		});

		try {
			await git.raw(['push', 'origin', '--delete', proposal.branch]);
		} catch {
			// best-effort cleanup; a stale remote branch is harmless
		}
		delete state.proposals[name];
		await this.stateService.save(state);
		return { name, merged };
	}

	private async resolve(prepared: PreparedScope, name: string) {
		const proposal: ProposalState | undefined = prepared.state.proposals[name];
		if (!proposal) throw new NotFoundError(`No proposal '${name}'`);
		const tip = await revParse(prepared.git, `origin/${proposal.branch}`);
		if (!tip) throw new NotFoundError(`Proposal branch '${proposal.branch}' not found on origin`);
		return { proposal, tip };
	}

	private async readPackage(git: PreparedScope['git'], ref: string): Promise<Package> {
		return parsePackageTree(await readTreeFiles(git, ref), ref.slice(0, 12)).pkg;
	}
}
