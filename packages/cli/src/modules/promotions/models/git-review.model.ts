import { Service } from '@n8n/di';
import { UnexpectedError, UserError } from 'n8n-workflow';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { checkoutBranch, withRepo } from './git-workspace';
import { exportUnitPackage, importUnitPackage } from './package-transport';
import type { PromotionContext, PromotionModel, SubmitPromotionRequest } from '../promotion-model';
import type { Promotion } from '../promotion.entity';
import { PromotionRepository } from '../promotion.repository';

interface GitReviewMetadata {
	repoUrl?: string;
	baseBranch?: string;
	branch?: string;
	/** Destination-side credential bindings: source credential id → local credential id. */
	bindings?: Record<string, string>;
	/** Source-side: id of a local workflow review request whose approval satisfies mark-ready. */
	localReviewId?: string;
	/** Last observed value per tracked signal, written by the signal dispatcher. */
	signals?: Record<string, unknown>;
	[key: string]: unknown;
}

/** The review state both instances coordinate through; lives in the branch next to the package. */
interface ReviewStateFile {
	promotionId: string;
	unitOfWork: { type: string; id: string };
	state: string;
	approvals: { source: boolean; destination: boolean };
}

/**
 * Git-coordinated promotion implementing the design-team prototype journey
 * (see .context/source-control-v2/prototype-walkthrough.md): submit exports
 * the unit of work onto a feature branch together with a review state file;
 * the source marks it ready; the destination resolves credential bindings,
 * approves, and applies (import + merge into the environment branch). The two
 * instances never talk to each other — all coordination happens through the
 * state file in the repo, matching the pure-git constraint of the design.
 *
 * POC simplifications: the package rides as a binary .n8np in the branch (no
 * per-file diffs), no GitHub PR object (the branch IS the review; apply does
 * the merge), and the destination tracks a review via an explicit submit with
 * role=destination instead of a repo watcher.
 *
 * Source submit options: `repoUrl` (pushable remote), `baseBranch` (default main),
 * `localReviewId` (optional: track a local workflow review — its approval fires
 * mark-ready without a manual action).
 * Destination submit options: `role=destination`, `repoUrl`, `branch`.
 */
@Service()
export class GitReviewModel implements PromotionModel {
	readonly name = 'git-review';

	constructor(private readonly repository: PromotionRepository) {}

	async submit(request: SubmitPromotionRequest, ctx: PromotionContext) {
		return request.options.role === 'destination'
			? await this.submitDestination(request)
			: await this.submitSource(request, ctx);
	}

	private async submitSource(
		{ unitOfWork, options }: SubmitPromotionRequest,
		ctx: PromotionContext,
	) {
		if (!unitOfWork) throw new UserError('git-review requires a unitOfWork');
		const repoUrl = options.repoUrl;
		if (typeof repoUrl !== 'string') throw new UserError('git-review requires option repoUrl');
		const baseBranch = typeof options.baseBranch === 'string' ? options.baseBranch : 'main';
		const localReviewId =
			typeof options.localReviewId === 'string' ? options.localReviewId : undefined;

		// Save first: the promotion id names the branch and the state file
		const promotion = await this.repository.save(
			this.repository.create({
				model: this.name,
				role: 'source' as const,
				unitOfWorkType: unitOfWork.type,
				unitOfWorkId: unitOfWork.id,
				state: 'in_review',
				metadata: { repoUrl, baseBranch, localReviewId } satisfies GitReviewMetadata,
			}),
		);
		const branch = `promote/${promotion.id}`;

		const packageBuffer = await exportUnitPackage(ctx.user, unitOfWork);

		await withRepo(repoUrl, async (git, dir) => {
			await checkoutBranch(git, branch);
			const reviewDir = join(dir, 'promotions', promotion.id);
			await mkdir(reviewDir, { recursive: true });
			await writeFile(join(reviewDir, 'package.n8np'), packageBuffer);
			await this.writeStateFile(dir, {
				promotionId: promotion.id,
				unitOfWork,
				state: 'in_review',
				approvals: { source: false, destination: false },
			});
			await git.add('.');
			await git.commit(`promotion ${promotion.id}: submit ${unitOfWork.type} ${unitOfWork.id}`);
			await git.push('origin', branch);
		});

		promotion.metadata = { ...promotion.metadata, branch };
		return await this.repository.save(promotion);
	}

	private async submitDestination({ options }: SubmitPromotionRequest) {
		const { repoUrl, branch } = options;
		if (typeof repoUrl !== 'string' || typeof branch !== 'string') {
			throw new UserError('git-review destination requires options repoUrl and branch');
		}
		const baseBranch = typeof options.baseBranch === 'string' ? options.baseBranch : 'main';

		const stateFile = await withRepo(repoUrl, async (git, dir) => {
			await checkoutBranch(git, branch);
			return await this.readStateFile(dir, this.promotionIdFromBranch(branch));
		});

		return await this.repository.save(
			this.repository.create({
				model: this.name,
				role: 'destination' as const,
				unitOfWorkType: stateFile.unitOfWork.type,
				unitOfWorkId: stateFile.unitOfWork.id,
				state: stateFile.state,
				metadata: { repoUrl, branch, baseBranch, bindings: {} } satisfies GitReviewMetadata,
			}),
		);
	}

	availableActions(promotion: Promotion) {
		if (promotion.role === 'source') {
			return promotion.state === 'in_review' ? ['mark-ready'] : [];
		}
		const byState: Record<string, string[]> = {
			in_review: ['resolve-binding'],
			waiting_on_destination: ['resolve-binding', 'approve'],
			approved: ['resolve-binding', 'apply'],
		};
		return byState[promotion.state] ?? [];
	}

	async execute(
		action: string,
		promotion: Promotion,
		payload: Record<string, unknown> | undefined,
		ctx: PromotionContext,
	) {
		switch (action) {
			case 'mark-ready':
				return await this.updateSharedState(promotion, 'waiting_on_destination', (file) => {
					file.approvals.source = true;
				});
			case 'resolve-binding':
				return await this.resolveBinding(promotion, payload);
			case 'approve':
				return await this.updateSharedState(promotion, 'approved', (file) => {
					file.approvals.destination = true;
				});
			case 'apply':
				return await this.apply(promotion, ctx);
			default:
				throw new UnexpectedError(`git-review has no action "${action}"`);
		}
	}

	/**
	 * Record a destination credential binding (walkthrough's Bindings tab):
	 * payload { sourceCredentialId, targetCredentialId }. Bindings feed the
	 * package import at apply time; credentials are never copied between
	 * instances.
	 */
	private async resolveBinding(promotion: Promotion, payload: Record<string, unknown> = {}) {
		const { sourceCredentialId, targetCredentialId } = payload;
		if (typeof sourceCredentialId !== 'string' || typeof targetCredentialId !== 'string') {
			throw new UserError(
				'resolve-binding requires payload { sourceCredentialId, targetCredentialId }',
			);
		}
		const metadata = promotion.metadata as GitReviewMetadata;
		promotion.metadata = {
			...metadata,
			bindings: { ...metadata.bindings, [sourceCredentialId]: targetCredentialId },
		};
		return await this.repository.save(promotion);
	}

	/** Destination apply: import the package with bindings, then merge the branch into the environment branch. */
	private async apply(promotion: Promotion, ctx: PromotionContext) {
		const { repoUrl, branch, baseBranch, bindings } = this.gitRef(promotion);

		const packageBuffer = await withRepo(repoUrl, async (git, dir) => {
			await checkoutBranch(git, branch);
			return await readFile(
				join(dir, 'promotions', this.promotionIdFromBranch(branch), 'package.n8np'),
			);
		});

		await importUnitPackage(ctx.user, packageBuffer, bindings);

		await withRepo(repoUrl, async (git, dir) => {
			await checkoutBranch(git, branch);
			const file = await this.readStateFile(dir, this.promotionIdFromBranch(branch));
			file.state = 'promoted';
			await this.writeStateFile(dir, file);
			await git.add('.');
			await git.commit(`promotion ${file.promotionId}: promoted`);
			await git.push('origin', branch);
			// The merge is the design's "PR merge"; no GitHub API in the POC
			await git.checkout(baseBranch);
			await git.merge([branch]);
			await git.push('origin', baseBranch);
		});

		promotion.state = 'promoted';
		return await this.repository.save(promotion);
	}

	/**
	 * Level-triggered re-evaluation of tracked signals: the tracked local review
	 * being approved satisfies the source's human gate, so it fires the same
	 * transition as a manual mark-ready. Guarded by the current state, so
	 * duplicate or late deliveries are no-ops.
	 */
	async onSignal(promotion: Promotion) {
		if (promotion.role !== 'source' || promotion.state !== 'in_review') return promotion;

		const { signals } = promotion.metadata as GitReviewMetadata;
		const review = signals?.['local-review'] as { decision?: string } | undefined;
		if (review?.decision !== 'approved') return promotion;

		return await this.updateSharedState(promotion, 'waiting_on_destination', (file) => {
			file.approvals.source = true;
		});
	}

	/** Both roles reconcile from the state file in the branch. */
	async sync(promotion: Promotion) {
		const { repoUrl, branch } = this.gitRef(promotion);
		const file = await withRepo(repoUrl, async (git, dir) => {
			await checkoutBranch(git, branch);
			return await this.readStateFile(dir, this.promotionIdFromBranch(branch));
		});
		promotion.state = file.state;
		promotion.metadata = { ...promotion.metadata, approvals: file.approvals };
		return await this.repository.save(promotion);
	}

	/** Write a new shared state to the state file in the branch, then mirror it locally. */
	private async updateSharedState(
		promotion: Promotion,
		state: string,
		mutate: (file: ReviewStateFile) => void,
	) {
		const { repoUrl, branch } = this.gitRef(promotion);
		await withRepo(repoUrl, async (git, dir) => {
			await checkoutBranch(git, branch);
			const file = await this.readStateFile(dir, this.promotionIdFromBranch(branch));
			file.state = state;
			mutate(file);
			await this.writeStateFile(dir, file);
			await git.add('.');
			await git.commit(`promotion ${file.promotionId}: ${state}`);
			await git.push('origin', branch);
		});
		promotion.state = state;
		return await this.repository.save(promotion);
	}

	private gitRef(promotion: Promotion) {
		const { repoUrl, branch, baseBranch, bindings } = promotion.metadata as GitReviewMetadata;
		if (!repoUrl || !branch) {
			throw new UnexpectedError('git-review promotion is missing repoUrl/branch metadata');
		}
		return { repoUrl, branch, baseBranch: baseBranch ?? 'main', bindings: bindings ?? {} };
	}

	private promotionIdFromBranch(branch: string) {
		return branch.replace(/^promote\//, '');
	}

	private stateFilePath(dir: string, promotionId: string) {
		return join(dir, 'promotions', promotionId, 'promotion.json');
	}

	private async readStateFile(dir: string, promotionId: string): Promise<ReviewStateFile> {
		try {
			const raw = await readFile(this.stateFilePath(dir, promotionId), 'utf-8');
			return JSON.parse(raw) as ReviewStateFile;
		} catch {
			throw new UserError(
				`No promotion state file found for "${promotionId}" in the repository — is the branch right?`,
			);
		}
	}

	private async writeStateFile(dir: string, file: ReviewStateFile) {
		await mkdir(join(dir, 'promotions', file.promotionId), { recursive: true });
		await writeFile(
			this.stateFilePath(dir, file.promotionId),
			JSON.stringify(file, null, 2) + '\n',
		);
	}
}
