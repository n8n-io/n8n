import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { jsonParse, UnexpectedError, UserError } from 'n8n-workflow';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { checkoutBranch, withRepo } from './git-workspace';
import { GithubApi, SelfApprovalError, type PullRequestInfo } from './github-api';
import { packPackageFiles, readPackageDir, unpackPackageFiles } from './package-files';
import { exportUnitPackage, importUnitPackage } from './package-transport';
import type { PromotionContext, PromotionModel, SubmitPromotionRequest } from '../promotion-model';
import type { Promotion } from '../promotion.entity';
import { PromotionRepository } from '../promotion.repository';
import { PromotionsConfig } from '../promotions.config';

interface RequiredCredential {
	id: string;
	name: string;
	type: string;
}

interface GithubReviewMetadata {
	baseBranch?: string;
	branch?: string;
	prNumber?: number;
	prNodeId?: string;
	prUrl?: string;
	/** Source-side: id of a local workflow review whose approval fires mark-ready. */
	localReviewId?: string;
	/** Destination-side credential bindings: source credential id → local credential id. */
	bindings?: Record<string, string>;
	/** Credentials the package declares it needs, captured from the manifest at destination submit. */
	requiredCredentials?: RequiredCredential[];
	approvals?: { source: boolean; destination: boolean };
	/** Last observed value per tracked signal, written by the signal dispatcher. */
	signals?: Record<string, unknown>;
	[key: string]: unknown;
}

/** Shape of the github-pr signal payload dispatched by GithubPrTracker. */
interface PrSnapshot {
	state?: string;
	draft?: boolean;
	merged?: boolean;
	destinationApproved?: boolean;
}

/** Static descriptor committed next to the package; all *state* lives in the PR. */
interface PromotionDescriptor {
	promotionId: string;
	unitOfWork: { type: string; id: string };
}

/**
 * GitHub-mediated promotion: like git-review, but the coordination state is
 * the pull request itself instead of a state file, mapped onto native PR
 * semantics — draft PR = source still reviewing (`in_review`); marked ready
 * for review = source approval (`waiting_on_destination`); an approving PR
 * review = destination approval (`approved`); merged = `promoted`. The two
 * instances never talk to each other; each acts on GitHub under its own
 * identity (which is what makes the destination's approval possible at all —
 * GitHub forbids the PR author from approving).
 *
 * The package is committed unpacked (per-file, pretty-printed JSON) so the
 * PR's file diff is human-reviewable; apply repacks the tree and imports it
 * with the destination's credential bindings, then merges the PR.
 *
 * Repo, token and watch branch come from PromotionsConfig (env vars, POC).
 * Source submit options: `baseBranch` (destination environment branch,
 * default main), `localReviewId` (optional local review to track).
 * Destination submit options: `role=destination`, `prNumber` — normally
 * invoked by the discovery tracker rather than a user.
 */
@Service()
export class GithubReviewModel implements PromotionModel {
	readonly name = 'github-review';

	constructor(
		private readonly logger: Logger,
		private readonly config: PromotionsConfig,
		private readonly repository: PromotionRepository,
	) {}

	async submit(request: SubmitPromotionRequest, ctx: PromotionContext) {
		return request.options.role === 'destination'
			? await this.submitDestination(request)
			: await this.submitSource(request, ctx);
	}

	private async submitSource(
		{ unitOfWork, options }: SubmitPromotionRequest,
		ctx: PromotionContext,
	) {
		if (!unitOfWork) throw new UserError('github-review requires a unitOfWork');
		const baseBranch = typeof options.baseBranch === 'string' ? options.baseBranch : 'main';
		const localReviewId =
			typeof options.localReviewId === 'string' ? options.localReviewId : undefined;

		// Save first: the promotion id names the branch and the package directory
		const promotion = await this.repository.save(
			this.repository.create({
				model: this.name,
				role: 'source' as const,
				unitOfWorkType: unitOfWork.type,
				unitOfWorkId: unitOfWork.id,
				state: 'in_review',
				metadata: { baseBranch, localReviewId } satisfies GithubReviewMetadata,
			}),
		);
		const branch = `promote/${promotion.id}`;

		const packageBuffer = await exportUnitPackage(ctx.user, unitOfWork);
		const files = await unpackPackageFiles(packageBuffer);
		const descriptor: PromotionDescriptor = { promotionId: promotion.id, unitOfWork };

		const api = this.api();
		await withRepo(api.cloneUrl, async (git, dir) => {
			await checkoutBranch(git, branch);
			const reviewDir = join(dir, 'promotions', promotion.id);
			for (const file of files) {
				const target = join(reviewDir, 'package', file.path);
				await mkdir(dirname(target), { recursive: true });
				await writeFile(target, file.content);
			}
			await mkdir(reviewDir, { recursive: true });
			await writeFile(
				join(reviewDir, 'promotion.json'),
				JSON.stringify(descriptor, null, 2) + '\n',
			);
			await git.add('.');
			await git.commit(`promotion ${promotion.id}: submit ${unitOfWork.type} ${unitOfWork.id}`);
			await git.push('origin', branch);
		});

		const pr = await api.createDraftPullRequest({
			title: `Promote ${unitOfWork.type} ${unitOfWork.id}`,
			body: `<!-- n8n-promotion:${promotion.id} -->\nPromotion \`${promotion.id}\`: ${unitOfWork.type} \`${unitOfWork.id}\`.\n\nOpened by the source n8n instance. The destination instance resolves bindings, approves, and applies (import + merge).`,
			head: branch,
			base: baseBranch,
		});

		promotion.metadata = {
			...promotion.metadata,
			branch,
			prNumber: pr.prNumber,
			prNodeId: pr.nodeId,
			prUrl: pr.url,
		};
		return await this.repository.save(promotion);
	}

	private async submitDestination({ options }: SubmitPromotionRequest) {
		const prNumber = Number(options.prNumber);
		if (!Number.isInteger(prNumber) || prNumber <= 0) {
			throw new UserError('github-review destination requires option prNumber');
		}

		const api = this.api();
		const pr = await api.getPullRequest(prNumber);
		const sourcePromotionId = this.promotionIdFromBranch(pr.headBranch);

		const descriptor = jsonParse<PromotionDescriptor>(
			await api.getFileText(`promotions/${sourcePromotionId}/promotion.json`, pr.headBranch),
			{ errorMessage: `PR #${prNumber} does not carry a readable promotion descriptor` },
		);
		const manifest = jsonParse<{ requirements?: { credentials?: RequiredCredential[] } }>(
			await api.getFileText(`promotions/${sourcePromotionId}/package/manifest.json`, pr.headBranch),
			{ errorMessage: `PR #${prNumber} does not carry a readable package manifest` },
		);
		const requiredCredentials = (manifest.requirements?.credentials ?? []).map(
			({ id, name, type }) => ({ id, name, type }),
		);

		const destinationApproved = await api.hasDestinationApproval(prNumber);
		return await this.repository.save(
			this.repository.create({
				model: this.name,
				role: 'destination' as const,
				unitOfWorkType: descriptor.unitOfWork.type,
				unitOfWorkId: descriptor.unitOfWork.id,
				state: this.deriveState(pr, destinationApproved),
				metadata: {
					baseBranch: pr.baseBranch,
					branch: pr.headBranch,
					prNumber,
					prNodeId: pr.nodeId,
					prUrl: pr.url,
					bindings: {},
					requiredCredentials,
					approvals: { source: !pr.draft, destination: destinationApproved },
				} satisfies GithubReviewMetadata,
			}),
		);
	}

	availableActions(promotion: Promotion) {
		if (promotion.role === 'source') {
			return promotion.state === 'in_review' ? ['mark-ready'] : [];
		}
		const canApply = this.unresolvedCredentialIds(promotion).length === 0;
		const byState: Record<string, string[]> = {
			in_review: ['resolve-binding'],
			waiting_on_destination: ['resolve-binding', 'approve'],
			approved: canApply ? ['resolve-binding', 'apply'] : ['resolve-binding'],
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
				return await this.markReady(promotion);
			case 'resolve-binding':
				return await this.resolveBinding(promotion, payload);
			case 'approve':
				return await this.approve(promotion);
			case 'apply':
				return await this.apply(promotion, ctx);
			default:
				throw new UnexpectedError(`github-review has no action "${action}"`);
		}
	}

	/** Source approval: take the PR out of draft ("Ready for review"). */
	private async markReady(promotion: Promotion) {
		const api = this.api();
		const pr = await api.getPullRequest(this.prNumber(promotion));
		await api.markReadyForReview(pr);
		return await this.saveObserved(promotion, { ...pr, draft: false }, false);
	}

	/**
	 * Record a destination credential binding (walkthrough's Bindings tab):
	 * payload { sourceCredentialId, targetCredentialId }. Bindings feed the
	 * package import at apply time; credentials are never copied between
	 * instances. Apply unlocks once every required credential is bound.
	 */
	private async resolveBinding(promotion: Promotion, payload: Record<string, unknown> = {}) {
		const { sourceCredentialId, targetCredentialId } = payload;
		if (typeof sourceCredentialId !== 'string' || typeof targetCredentialId !== 'string') {
			throw new UserError(
				'resolve-binding requires payload { sourceCredentialId, targetCredentialId }',
			);
		}
		const metadata = promotion.metadata as GithubReviewMetadata;
		promotion.metadata = {
			...metadata,
			bindings: { ...metadata.bindings, [sourceCredentialId]: targetCredentialId },
		};
		return await this.repository.save(promotion);
	}

	/** Destination approval: a real PR review, or a marker comment when both instances share one identity. */
	private async approve(promotion: Promotion) {
		const api = this.api();
		const prNumber = this.prNumber(promotion);
		try {
			await api.approve(prNumber);
		} catch (error) {
			if (!(error instanceof SelfApprovalError)) throw error;
			this.logger.warn(
				'github-review: GitHub rejected the PR self-approval; recording the destination approval as a marker comment instead. Configure distinct GitHub identities per instance to get real PR reviews.',
			);
			await api.commentDestinationApproval(prNumber);
		}
		const pr = await api.getPullRequest(prNumber);
		return await this.saveObserved(promotion, pr, true);
	}

	/** Destination apply: repack the committed package tree, import with bindings, merge the PR. */
	private async apply(promotion: Promotion, ctx: PromotionContext) {
		const unresolved = this.unresolvedCredentialIds(promotion);
		if (unresolved.length > 0) {
			throw new UserError(
				`Cannot apply: ${unresolved.length} credential binding(s) still unresolved (${unresolved.join(', ')})`,
			);
		}

		const api = this.api();
		const { branch, bindings } = this.prRef(promotion);
		const sourcePromotionId = this.promotionIdFromBranch(branch);

		const files = await withRepo(api.cloneUrl, async (git, dir) => {
			await checkoutBranch(git, branch);
			return await readPackageDir(join(dir, 'promotions', sourcePromotionId, 'package'));
		});
		const packageBuffer = await packPackageFiles(files);
		await importUnitPackage(ctx.user, packageBuffer, bindings);

		await api.merge(this.prNumber(promotion));
		promotion.state = 'promoted';
		return await this.repository.save(promotion);
	}

	/** Both roles reconcile from the PR; the PR is the shared state. */
	async sync(promotion: Promotion) {
		const api = this.api();
		const pr = await api.getPullRequest(this.prNumber(promotion));
		const destinationApproved = await api.hasDestinationApproval(pr.prNumber);
		return await this.saveObserved(promotion, pr, destinationApproved);
	}

	/**
	 * Level-triggered re-evaluation of tracked signals: a tracked local
	 * review's approval fires mark-ready on the source, and github-pr
	 * snapshots (from the tracker) reconcile state without extra API calls.
	 * Guarded by current state, so duplicate or late deliveries are no-ops.
	 */
	async onSignal(promotion: Promotion) {
		const { signals, localReviewId } = promotion.metadata as GithubReviewMetadata;

		if (promotion.role === 'source' && promotion.state === 'in_review' && localReviewId) {
			const review = signals?.['local-review'] as { decision?: string } | undefined;
			if (review?.decision === 'approved') return await this.markReady(promotion);
		}

		const snapshot = signals?.['github-pr'] as PrSnapshot | undefined;
		if (snapshot) {
			const state = this.deriveState(snapshot, snapshot.destinationApproved === true);
			if (state !== promotion.state) {
				promotion.state = state;
				promotion.metadata = {
					...promotion.metadata,
					approvals: {
						source: snapshot.draft !== true,
						destination: snapshot.destinationApproved === true,
					},
				};
				return await this.repository.save(promotion);
			}
		}
		return promotion;
	}

	private deriveState(
		pr: { state?: string; draft?: boolean; merged?: boolean },
		destinationApproved: boolean,
	): string {
		if (pr.merged) return 'promoted';
		if (pr.state === 'closed') return 'closed';
		if (pr.draft) return 'in_review';
		return destinationApproved ? 'approved' : 'waiting_on_destination';
	}

	private async saveObserved(
		promotion: Promotion,
		pr: PullRequestInfo,
		destinationApproved: boolean,
	) {
		promotion.state = this.deriveState(pr, destinationApproved);
		promotion.metadata = {
			...promotion.metadata,
			approvals: { source: !pr.draft, destination: destinationApproved },
		};
		return await this.repository.save(promotion);
	}

	/**
	 * POC: unresolved = required credentials without an explicit binding. The
	 * import's name-and-type matching could satisfy some implicitly, but the
	 * POC keeps the rule simple and demands a binding for each.
	 */
	private unresolvedCredentialIds(promotion: Promotion): string[] {
		const { requiredCredentials, bindings } = promotion.metadata as GithubReviewMetadata;
		return (requiredCredentials ?? [])
			.filter((credential) => !bindings?.[credential.id])
			.map((credential) => credential.id);
	}

	private api(): GithubApi {
		const { githubToken, githubRepo } = this.config;
		const [owner, repo] = githubRepo.split('/');
		if (!githubToken || !owner || !repo) {
			throw new UserError(
				'github-review requires N8N_PROMOTIONS_GITHUB_TOKEN and N8N_PROMOTIONS_GITHUB_REPO ("owner/name")',
			);
		}
		return new GithubApi({ owner, repo, token: githubToken });
	}

	private prNumber(promotion: Promotion): number {
		const { prNumber } = promotion.metadata as GithubReviewMetadata;
		if (typeof prNumber !== 'number') {
			throw new UnexpectedError('github-review promotion is missing prNumber metadata');
		}
		return prNumber;
	}

	private prRef(promotion: Promotion) {
		const { branch, bindings } = promotion.metadata as GithubReviewMetadata;
		if (!branch) throw new UnexpectedError('github-review promotion is missing branch metadata');
		return { branch, bindings: bindings ?? {} };
	}

	private promotionIdFromBranch(branch: string) {
		return branch.replace(/^promote\//, '');
	}
}
