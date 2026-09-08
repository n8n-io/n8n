import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	linkUserToProject,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import {
	WorkflowHistoryRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';
import type { MockProxy } from 'vitest-mock-extended';

import type { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { createMember, createOwner } from '@test-integration/db/users';
import { createWorkflowHistoryItem } from '@test-integration/db/workflow-history';
import type { SuperAgentTest } from '@test-integration/types';

/**
 * Shared fixtures for the workflow-review integration suites. Each suite still
 * calls `setupTestServer` and `mockInstance` itself: those register `beforeAll`
 * hooks at call time, so they have to run while the test file's own module is
 * being evaluated.
 */

/**
 * Truncation order matters: `WorkflowPublishedVersion` FKs onto `WorkflowHistory`
 * with `onDelete RESTRICT`, so it has to go first.
 */
export const REVIEW_TABLES = [
	'WorkflowReviewActivityComment',
	'WorkflowReviewActivity',
	'WorkflowReviewRequestAuthor',
	'WorkflowReviewRequestReviewer',
	'WorkflowReviewRequestWorkflow',
	'WorkflowReviewRequest',
	'SharedWorkflow',
	'WorkflowPublishedVersion',
	'WorkflowPublicationOutbox',
	'WorkflowPublishHistory',
	'WorkflowEntity',
	'WorkflowHistory',
	'ProjectRelation',
	'Project',
	'User',
] as const;

/** Test workflows carry no trigger nodes, so activation must not fail on that. */
export function stubWorkflowValidation(
	workflowValidationService: MockProxy<WorkflowValidationService>,
): void {
	workflowValidationService.validateForActivation.mockReturnValue({ isValid: true });
	workflowValidationService.validateDynamicCredentials.mockResolvedValue({ isValid: true });
	workflowValidationService.validateSubWorkflowReferences.mockResolvedValue({ isValid: true });
	workflowValidationService.validateTriggerNodeIds.mockReturnValue({ isValid: true });
}

export interface ReviewActors {
	owner: User;
	/** `project:editor` on `teamProject`, so they hold `workflow:publish` there. */
	member: User;
	/** `project:viewer` on `teamProject`, so they hold `workflow:read` only. */
	viewer: User;
	ownerProject: Project;
	teamProject: Project;
}

/** The cast of users and projects every review suite builds its scenarios from. */
export async function seedReviewActors(authAgentFor: (user: User) => SuperAgentTest): Promise<
	ReviewActors & {
		ownerAgent: SuperAgentTest;
		memberAgent: SuperAgentTest;
		viewerAgent: SuperAgentTest;
	}
> {
	const owner = await createOwner();
	const member = await createMember();
	const viewer = await createMember();
	const ownerProject = await getPersonalProject(owner);
	const teamProject = await createTeamProject('Reviews Project', owner);
	await linkUserToProject(member, teamProject, 'project:editor');
	await linkUserToProject(viewer, teamProject, 'project:viewer');

	return {
		owner,
		member,
		viewer,
		ownerProject,
		teamProject,
		ownerAgent: authAgentFor(owner),
		memberAgent: authAgentFor(member),
		viewerAgent: authAgentFor(viewer),
	};
}

/** A workflow with one history version, ready to be submitted for review. */
export async function createReviewableWorkflow(
	ownerOrProject: User | Project,
	{
		versionId = uuid(),
		...attributes
	}: { versionId?: string; isArchived?: boolean; name?: string } = {},
) {
	const workflow = await createWorkflow({ versionId, ...attributes }, ownerOrProject);
	await createWorkflowHistoryItem(workflow.id, { versionId });
	return { workflow, versionId };
}

export interface SeedReviewOptions {
	projectId: string;
	workflowId?: string;
	/** `null` pins no version; omit to link no workflow at all. */
	versionId?: string | null;
	author: User;
	reviewerIds?: string[];
	state?: 'open' | 'closed';
	decision?: 'pending' | 'changes_requested' | 'approved';
	title?: string;
	description?: string | null;
	/** Who last touched the review — the decision actor on a decided review. */
	updatedById?: string | null;
}

/**
 * Seed a review the way the create endpoint does: the request, its workflow link,
 * an author row for the requester, and any assigned reviewers.
 */
export async function seedReview({
	projectId,
	workflowId,
	versionId = null,
	author,
	reviewerIds = [],
	state,
	decision,
	title = 'Review before publishing',
	description,
	updatedById,
}: SeedReviewOptions) {
	const request = await Container.get(WorkflowReviewRequestRepository).createRequest(
		{ projectId, title, description, createdById: author.id, state, decision, updatedById },
		{},
	);

	if (workflowId !== undefined) {
		await Container.get(WorkflowReviewRequestWorkflowRepository).createWorkflowRow(
			{ workflowReviewRequestId: request.id, workflowId, workflowVersionId: versionId },
			{},
		);
	}

	await Container.get(WorkflowReviewRequestAuthorRepository).addAuthor(
		{ workflowReviewRequestId: request.id, userId: author.id },
		{},
	);

	if (reviewerIds.length > 0) {
		await Container.get(WorkflowReviewRequestReviewerRepository).addReviewers(
			{ workflowReviewRequestId: request.id, userIds: reviewerIds },
			{},
		);
	}

	return request;
}

/** The single-workflow `workflows` array every submission payload carries. */
export function reviewPayload({
	workflowId,
	versionId,
	versionName = 'Release candidate',
	versionDescription,
	...rest
}: {
	workflowId: string;
	versionId: string;
	versionName?: string;
	versionDescription?: string;
	title?: string;
	description?: string;
	reviewerUserIds?: string[];
}) {
	return {
		title: 'Please review my workflow',
		...rest,
		workflows: [
			{
				workflowId,
				workflowVersionId: versionId,
				workflowVersionName: versionName,
				...(versionDescription === undefined
					? {}
					: { workflowVersionDescription: versionDescription }),
			},
		],
	};
}

/** The body of a version-update request. */
export function versionUpdatePayload({
	workflowId,
	versionId,
	versionName = 'Release candidate',
	...rest
}: {
	workflowId: string;
	versionId: string;
	versionName?: string;
	workflowVersionDescription?: string;
	description?: string;
}) {
	return {
		workflowId,
		workflowVersionId: versionId,
		workflowVersionName: versionName,
		...rest,
	};
}

export type ActivityFeedEntry = {
	id: string;
	type: string;
	data: Record<string, unknown> | null;
	createdBy: { id: string } | null;
	messages?: Array<{ body: string | null; createdBy: unknown; deletedAt: string | null }>;
};

/** Read the feed through the endpoint, so entries are asserted as a reader sees them. */
export async function readActivityFeed(
	agent: SuperAgentTest,
	requestId: string,
	limit?: number,
): Promise<{ data: ActivityFeedEntry[]; nextCursor: string | null; hasMore: boolean }> {
	const response = await agent
		.get(`/workflow-review-requests/${requestId}/activity`)
		.query(limit === undefined ? {} : { limit })
		.expect(200);
	return response.body.data;
}

export async function findVersionName(workflowId: string, versionId: string) {
	const version = await Container.get(WorkflowHistoryRepository).findOneBy({
		workflowId,
		versionId,
	});
	return version?.name;
}
