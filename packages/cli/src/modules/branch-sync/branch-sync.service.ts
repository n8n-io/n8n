import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { SimpleGit } from 'simple-git';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { BranchSyncStateService, projectIdOfScope } from './branch-sync-state.service';
import type { ScopeState } from './branch-sync-state.service';
import { reconcile } from './engine/reconcile';
import type { ConflictPolicy, Decision, Package, ReconcileResult, ScopeRole } from './engine/types';
import {
	authorCommit,
	countCommits,
	diffNameStatus,
	diffStagedAgainst,
	EMPTY_TREE_SHA,
	isAncestor,
	readTreeFiles,
	revParse,
	stageLivePackage,
} from './git/git-tree';
import { ScopeRepoService } from './git/scope-repo';
import { LiveApplyService } from './live/live-apply.service';
import { LiveSnapshotService } from './live/live-snapshot.service';
import type { PackageFileError } from './spec/projections';
import { parsePackageTree, resourceKindOf, serializePackage } from './spec/projections';

export interface ConnectParams {
	scopeKey?: string;
	repoUrl: string;
	branch: string;
	role: ScopeRole;
	policy?: ConflictPolicy;
	editable?: boolean;
}

export interface ReconcileParams {
	/** Explicit per-path conflict resolutions. */
	choices?: Record<string, 'head' | 'live'>;
	/** Partial apply (D009): restrict to these paths; base does not advance. */
	select?: string[];
	/** Pin (D009): reconcile toward this commit instead of head; base := to. */
	to?: string;
}

export interface PreparedScope {
	state: ScopeState;
	git: SimpleGit;
	dir: string;
	headSha: string | null;
}

export interface PlanContext extends PreparedScope {
	/** The commit being reconciled toward (head, or the pinned `to`). */
	target: string;
	basePkg: Package;
	headPkg: Package;
	livePkg: Package;
	result: ReconcileResult;
	errors: PackageFileError[];
}

@Service()
export class BranchSyncService {
	constructor(
		private readonly stateService: BranchSyncStateService,
		private readonly scopeRepoService: ScopeRepoService,
		private readonly liveSnapshotService: LiveSnapshotService,
		private readonly liveApplyService: LiveApplyService,
	) {}

	async connect(params: ConnectParams): Promise<ScopeState> {
		if (!params.repoUrl || !params.branch || !params.role) {
			throw new BadRequestError('repoUrl, branch and role are required');
		}
		const state: ScopeState = {
			scopeKey: params.scopeKey ?? 'instance',
			repoUrl: params.repoUrl,
			branch: params.branch,
			role: params.role,
			policy: params.policy ?? 'manual',
			editable: params.editable ?? true,
			// D008: first connect seeds base = empty tree, so the first sync is a
			// safe union — deletion is structurally impossible until base advances.
			baseCommit: EMPTY_TREE_SHA,
			proposals: {},
		};
		await this.scopeRepoService.getRepo(state); // clones the repo
		await this.stateService.save(state);
		return state;
	}

	async listScopes() {
		const states = await this.stateService.list();
		return await Promise.all(
			states.map(async (state) => {
				const { git } = await this.scopeRepoService.getRepo(state);
				await git.fetch('origin');
				const headSha = await revParse(git, `origin/${state.branch}`);
				const ahead =
					headSha && state.baseCommit !== EMPTY_TREE_SHA
						? await countCommits(git, state.baseCommit, headSha)
						: null;
				return { ...state, head: headSha, aheadOfBase: ahead };
			}),
		);
	}

	/** Commits between base and head (inclusive of base) — feeds the pin-to-commit picker. */
	async listCommits(scopeKey: string) {
		const { state, git, headSha } = await this.prepare(scopeKey);
		if (!headSha) return [];
		const range = state.baseCommit === EMPTY_TREE_SHA ? headSha : `${state.baseCommit}..${headSha}`;
		const lines = (await git.raw(['log', '--format=%H%x09%s', range])).split('\n');
		if (state.baseCommit !== EMPTY_TREE_SHA) {
			lines.push(
				...(await git.raw(['log', '-1', '--format=%H%x09%s', state.baseCommit])).split('\n'),
			);
		}
		return lines
			.map((line) => line.trim())
			.filter(Boolean)
			.map((line) => {
				const [sha, ...rest] = line.split('\t');
				return {
					sha,
					message: rest.join('\t'),
					isBase: sha === state.baseCommit,
					isTarget: sha === headSha,
				};
			});
	}

	async plan(scopeKey: string, params: ReconcileParams = {}) {
		const prepared = await this.prepare(scopeKey);
		const ctx = await this.buildPlan(prepared, params);
		return this.toPlanResponse(ctx);
	}

	/**
	 * Full reconcile (D002/D003): apply inward decisions to the instance; a
	 * source additionally commits+pushes its outgoing delta as one linear commit
	 * on top of head, retrying on a fast-forward rejection (never force-push).
	 */
	async sync(scopeKey: string, params: ReconcileParams, user: User) {
		const MAX_PUSH_ATTEMPTS = 3;
		for (let attempt = 1; attempt <= MAX_PUSH_ATTEMPTS; attempt++) {
			const prepared = await this.prepare(scopeKey);
			const ctx = await this.buildPlan(prepared, params);
			const { state, result } = ctx;

			const report = await this.liveApplyService.apply(
				result.decisions,
				ctx.headPkg,
				user,
				projectIdOfScope(state.scopeKey),
			);

			let pushedCommit: string | null = null;
			if (state.role === 'source' && result.outgoing.length > 0 && !result.pushBlocked) {
				// D003/D009: a source contributes only when fully aligned with head.
				if (params.select) {
					throw new BadRequestError(
						'Cannot push a partial apply — contribution requires full alignment',
					);
				}
				if (ctx.headSha && ctx.target !== ctx.headSha) {
					throw new ConflictError('Pinned behind head — catch up to head before contributing');
				}

				await stageLivePackage(ctx.git, ctx.dir, serializePackage(result.resultingHead));
				try {
					pushedCommit = await authorCommit(ctx.git, {
						message: `n8n branch-sync: reconcile ${state.scopeKey}`,
						parents: ctx.headSha ? [ctx.headSha] : [],
						targetBranch: state.branch,
					});
				} catch (e) {
					// Fast-forward rejected: head moved under us. Refetch, re-reconcile
					// (may surface new conflicts), retry.
					if (attempt < MAX_PUSH_ATTEMPTS) continue;
					throw new ConflictError(
						`Push rejected ${attempt} times (head kept moving): ${(e as Error).message}`,
					);
				}
			}

			const response = this.toPlanResponse(ctx);

			if (result.baseAdvances && report.failed.length === 0) {
				const landed = pushedCommit ?? (ctx.target !== EMPTY_TREE_SHA ? ctx.target : null);
				if (landed) {
					state.baseCommit = landed;
					await this.stateService.save(state);
				}
			}

			return {
				...response,
				newBase: state.baseCommit,
				pushedCommit,
				applied: report.applied,
				failed: report.failed,
			};
		}
		throw new ConflictError('Sync did not complete');
	}

	async prepare(scopeKey: string): Promise<PreparedScope> {
		const state = await this.stateService.get(scopeKey);
		if (!state) throw new NotFoundError(`No tracked scope '${scopeKey}'`);
		const { git, dir } = await this.scopeRepoService.getRepo(state);
		await git.fetch('origin');
		const headSha = await revParse(git, `origin/${state.branch}`);
		return { state, git, dir, headSha };
	}

	/**
	 * The three-way plan (D002/D006): read base and target trees from git,
	 * serialize live into the worktree, let git compute both name-status diffs,
	 * and run the engine. Read-only towards the instance and the remote.
	 */
	async buildPlan(prepared: PreparedScope, params: ReconcileParams): Promise<PlanContext> {
		const { state, git, dir, headSha } = prepared;
		const base = state.baseCommit;

		let target = headSha ?? EMPTY_TREE_SHA;
		if (params.to) {
			const resolved = await revParse(git, params.to);
			if (!resolved) throw new BadRequestError(`Unknown commit '${params.to}'`);
			target = resolved;
		}

		// B2 / D008 guard: a rewritten history (or branch switch) orphans the base,
		// making `base..target` meaningless. Surface it instead of guessing.
		if (
			base !== EMPTY_TREE_SHA &&
			target !== EMPTY_TREE_SHA &&
			!(await isAncestor(git, base, target))
		) {
			throw new ConflictError(
				`Stored base ${base.slice(0, 12)} is not an ancestor of target ${target.slice(0, 12)} — reconnect required`,
			);
		}

		const baseParsed = parsePackageTree(await readTreeFiles(git, base), 'base');
		const headParsed = parsePackageTree(await readTreeFiles(git, target), 'head');
		const basePkg = baseParsed.pkg;
		const headPkg = headParsed.pkg;
		const errors: PackageFileError[] = [...baseParsed.errors, ...headParsed.errors];
		const excluded = new Set(errors.map((e) => e.path));
		const livePkg = await this.liveSnapshotService.snapshot(projectIdOfScope(state.scopeKey));

		await stageLivePackage(git, dir, serializePackage(livePkg));
		const gitDiff = await diffNameStatus(git, base, target);
		const liveDiff = await diffStagedAgainst(git, base);
		for (const path of excluded) {
			gitDiff.delete(path);
			liveDiff.delete(path);
		}

		const result = reconcile(basePkg, headPkg, livePkg, {
			role: state.role,
			editable: state.editable,
			policy: state.policy,
			choices: params.choices,
			select: params.select,
			gitDiff,
			liveDiff,
			// Credentials are bindings; a project may still hold local-only work.
			// Neither is ever auto-deleted by an incoming absence (D007).
			isDeletionExempt: (path) => ['credential', 'project'].includes(resourceKindOf(path) ?? ''),
		});

		return { state, git, dir, headSha, target, basePkg, headPkg, livePkg, result, errors };
	}

	toPlanResponse(ctx: PlanContext) {
		const { state, result } = ctx;
		return {
			scopeKey: state.scopeKey,
			role: state.role,
			policy: state.policy,
			editable: state.editable,
			base: state.baseCommit,
			head: ctx.headSha,
			target: ctx.target,
			decisions: this.withNames(ctx, result.decisions),
			conflicts: this.withNames(ctx, result.blocked),
			outgoing: this.withNames(ctx, result.outgoing),
			deferred: this.withNames(ctx, result.deferred),
			pushBlocked: result.pushBlocked,
			baseAdvances: result.baseAdvances,
			errors: ctx.errors,
		};
	}

	/** Attach a display name (workflow/credential `name`, variable `key`) to each row. */
	private withNames(ctx: PlanContext, rows: Decision[]) {
		return rows.map((d) => {
			const content = ctx.headPkg[d.path] ?? ctx.livePkg[d.path] ?? ctx.basePkg[d.path];
			const name = content ? ((content.name ?? content.key ?? null) as string | null) : null;
			return { ...d, name };
		});
	}
}
