import {
	promotionRunDetailsSchemas,
	type PromotionResourceDetail,
	type PromotionResourceDetails,
	type PromotionReviewChanges,
	type PromotionReviewDetailsRequestDto,
	type PromotionReviewWarning,
	type SerializedWorkflow,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import { jsonParse } from 'n8n-workflow';

import { gitBlobSha } from '@/modules/n8n-packages/io/hashing-package-writer';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { PACKAGE_SUBFOLDER } from './constants';
import type { PromotionEnvironment } from './database/entities/promotion-environment.entity';
import type { PromotionReview } from './database/entities/promotion-review.entity';
import { PromotionReviewRepository } from './database/repositories/promotion-review.repository';
import {
	GitLabMergeRequestClient,
	gitLabReviewHeadRef,
	parseGitLabReviewId,
} from './git-hosts/gitlab-merge-request.client';
import type { GitLabMergeRequest, MergeRequestRef } from './git-hosts/gitlab-merge-request.types';
import { parsePackageManifest, toDetail, type DetailSide } from './promotion-change.service';
import { buildPreview, indexProjects, type PreviewSide } from './promotion-preview';
import { PromotionReviewHostResolver } from './promotion-review-host.resolver';
import { PromotionReviewInboxService } from './promotion-review-inbox.service';
import { PromotionsService } from './promotions.service';
import type { PackageCommit } from './promotions.types';

const MANIFEST_PATH = `${PACKAGE_SUBFOLDER}/${MANIFEST_FILE}`;

type ReviewSide = { side: PreviewSide; manifestUnreadable: boolean };

/** A stored review with the environment and the host ref that its reads need. */
type ReviewTarget = {
	review: PromotionReview;
	environment: PromotionEnvironment;
	ref: MergeRequestRef;
	headRef: string;
};

/**
 * What a promotion review changes on its target branch. Both sides are commits of the
 * review: the head holds what the review proposes, and the baseline is where it starts.
 */
@Service()
export class PromotionReviewChangesService {
	constructor(
		private readonly reviewRepository: PromotionReviewRepository,
		private readonly reviewInbox: PromotionReviewInboxService,
		private readonly hostResolver: PromotionReviewHostResolver,
		private readonly mergeRequests: GitLabMergeRequestClient,
		private readonly promotionsService: PromotionsService,
	) {}

	/** Reads the head from the host, so the summary shows the review as it is now. */
	async getChanges(reviewId: string): Promise<PromotionReviewChanges> {
		const target = await this.findReview(reviewId);
		const mergeRequest = await this.readMergeRequest(target);
		const headCommitSha = mergeRequest.sha ?? mergeRequest.diff_refs?.head_sha;
		if (!headCommitSha) {
			throw new BadRequestError('GitLab did not report the head commit of the merge request.');
		}
		const commits = await this.promotionsService.readReviewCommits(target.environment.id, {
			headRef: target.headRef,
			headCommitSha,
			baseline: baselineOf(mergeRequest),
		});
		const [base, head] = [await readSide(commits.baseline), await readSide(commits.head)];
		const commitShas = {
			baselineCommitSha: commits.baseline.commitSha,
			headCommitSha: commits.head.commitSha,
		};
		const warnings: PromotionReviewWarning[] = [];
		if (base.manifestUnreadable) warnings.push('baselineManifestUnreadable');
		if (head.manifestUnreadable) warnings.push('headManifestUnreadable');
		// Without a manifest, every resource of the other side looks added or deleted.
		if (warnings.length > 0) return { ...commitShas, resources: [], dependencies: [], warnings };

		const projectIds = projectIdsOf(base.side.manifest, head.side.manifest);
		const archiveState = await readArchiveState(commits.head, base.side, head.side, projectIds);
		const { resources, dependencies } = buildPreview({
			operation: null,
			projectIds,
			base: base.side,
			desired: head.side,
			isArchived: (path) => archiveState.get(path) ?? false,
		});
		return { ...commitShas, resources, dependencies, warnings };
	}

	/** Reads both sides at the commits of the summary, without the host. */
	async getDetails(
		user: User,
		reviewId: string,
		{ baselineCommitSha, headCommitSha, keys }: PromotionReviewDetailsRequestDto,
	): Promise<PromotionResourceDetails> {
		const target = await this.findReview(reviewId);
		const commits = await this.promotionsService.readReviewCommits(target.environment.id, {
			headRef: target.headRef,
			headCommitSha,
			baseline: { commitSha: baselineCommitSha },
		});
		const baseManifest = await readManifest(commits.baseline);
		const headManifest = await readManifest(commits.head);
		const projectIds = projectIdsOf(baseManifest, headManifest);
		const baseIndex = indexProjects({ manifest: baseManifest, blobByPath: new Map() }, projectIds);
		const headIndex = indexProjects({ manifest: headManifest, blobByPath: new Map() }, projectIds);
		const baseContents = await commits.baseline.readFiles(
			keys.flatMap((key) => baseIndex.get(key)?.path ?? []),
		);
		const headContents = await commits.head.readFiles(
			keys.flatMap((key) => headIndex.get(key)?.path ?? []),
		);
		const canSeeVariableValues = hasGlobalScope(user, 'variable:list');

		const details = keys.flatMap((key): PromotionResourceDetail[] => {
			const before = baseIndex.get(key);
			const after = headIndex.get(key);
			const resource = after ?? before;
			if (!resource) return [];
			return [
				toDetail({
					key,
					type: resource.type,
					before: detailSide(before && baseContents.get(before.path)),
					after: detailSide(after && headContents.get(after.path)),
					hideVariableValues: resource.type === 'variable' && !canSeeVariableValues,
				}),
			];
		});
		const missingKeys = keys.filter((key) => !baseIndex.has(key) && !headIndex.has(key));
		return { details, missingKeys };
	}

	private async findReview(reviewId: string): Promise<ReviewTarget> {
		if (!this.reviewInbox.isEnabled()) {
			throw new ForbiddenError('Promotion reviews are not enabled.');
		}
		const review = await this.reviewRepository.findByIdWithRelations(reviewId);
		if (!review) throw new NotFoundError('Promotion review not found.');
		const { environment, remoteReviewId } = review;
		if (!environment || !remoteReviewId) {
			throw new BadRequestError('The environment of this promotion review was deleted.');
		}
		const ref = parseGitLabReviewId(remoteReviewId);
		return { review, environment, ref, headRef: gitLabReviewHeadRef(ref) };
	}

	private async readMergeRequest({ review, environment, ref }: ReviewTarget) {
		const access = await this.hostResolver.resolveForEnvironment(environment, review.type);
		if (!access) {
			throw new BadRequestError('The environment of this promotion review no longer uses GitLab.');
		}
		const mergeRequest = await this.mergeRequests.getMergeRequest(access, ref);
		// The stored ids are not unique across hosts. Only the branch n8n pushed proves it is ours.
		if (mergeRequest.source_branch !== newestBranchName(review)) {
			throw new NotFoundError('GitLab could not find the merge request of this promotion.');
		}
		return mergeRequest;
	}
}

/**
 * An open review diffs against its merge base with the target branch, so a rebase on the host
 * does not add the commits of the target branch. After a merge, that merge base is the head
 * itself, so a merged or closed review diffs against the base that the host recorded.
 */
function baselineOf(
	mergeRequest: GitLabMergeRequest,
): { targetBranchName: string } | { commitSha: string; targetBranchName: string } {
	if (mergeRequest.state === 'opened' || mergeRequest.state === 'locked') {
		return { targetBranchName: mergeRequest.target_branch };
	}
	const commitSha = mergeRequest.diff_refs?.base_sha;
	if (!commitSha) {
		throw new BadRequestError('GitLab did not report the base commit of the merge request.');
	}
	return { commitSha, targetBranchName: mergeRequest.target_branch };
}

function newestBranchName({ runs }: PromotionReview): string | null {
	const newest = runs.toSorted(
		(a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id),
	)[0];
	if (!newest) return null;
	const details = promotionRunDetailsSchemas[newest.type].safeParse(newest.details);
	return details.success ? details.data.branchName : null;
}

async function readManifest(commit: PackageCommit): Promise<PackageManifest | null> {
	return parsePackageManifest((await commit.readFiles([MANIFEST_PATH])).get(MANIFEST_PATH));
}

async function readSide(commit: PackageCommit): Promise<ReviewSide> {
	const blobByPath = await commit.listFiles();
	const manifest = await readManifest(commit);
	// A commit before the first promotion has no package, so it has no manifest either.
	return { side: { manifest, blobByPath }, manifestUnreadable: !manifest && blobByPath.size > 0 };
}

/** A full promotion writes every team project, so the review can span several of them. */
function projectIdsOf(...manifests: Array<PackageManifest | null>): string[] {
	return [
		...new Set(manifests.flatMap((manifest) => manifest?.projects?.map(({ id }) => id) ?? [])),
	];
}

/** Archive state separates "archived" from "modified", so only changed workflows are read. */
async function readArchiveState(
	head: PackageCommit,
	base: PreviewSide,
	desired: PreviewSide,
	projectIds: readonly string[],
): Promise<Map<string, boolean>> {
	const baseIndex = indexProjects(base, projectIds);
	const paths = [...indexProjects(desired, projectIds).values()].flatMap((resource) => {
		const before = baseIndex.get(resource.key);
		return resource.type === 'workflow' && before && before.blobSha !== resource.blobSha
			? [resource.path]
			: [];
	});
	const files = await head.readFiles(paths);
	return new Map(
		[...files].map(([path, raw]) => [
			path,
			jsonParse<SerializedWorkflow>(raw, { fallbackValue: undefined })?.isArchived ?? false,
		]),
	);
}

function detailSide(content: string | undefined): DetailSide {
	return content === undefined
		? { content: null, blobSha: null }
		: { content, blobSha: gitBlobSha(content) };
}
