import type { BulkWorkflowActionResult, BulkWorkflowActionResultItem } from '@n8n/api-types';
import type { User, WorkflowEntity } from '@n8n/db';
import { FolderRepository, WorkflowPublishedVersionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { CollaborationService } from '@/collaboration/collaboration.service';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { ProjectService } from '@/services/project.service.ee';

import { WorkflowFinderService } from './workflow-finder.service';
import { WorkflowService } from './workflow.service';
import { EnterpriseWorkflowService } from './workflow.service.ee';

type PreflightIssue = {
	workflowId?: string;
	reason: string;
	message: string;
};

type PreflightOptions = {
	action: string;
	clientId?: string;
	includeParentFolder?: boolean;
	includeShared?: boolean;
	validate?: (workflow: WorkflowEntity) => PreflightIssue | undefined;
};

type ExecuteItem = (
	workflow: WorkflowEntity,
) => Promise<Omit<BulkWorkflowActionResultItem, 'workflowId'>>;

const LIFECYCLE_BATCH_SIZE = 5;

@Service()
export class WorkflowBulkActionService {
	constructor(
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowService: WorkflowService,
		private readonly enterpriseWorkflowService: EnterpriseWorkflowService,
		private readonly collaborationService: CollaborationService,
		private readonly projectService: ProjectService,
		private readonly folderRepository: FolderRepository,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly credentialsFinderService: CredentialsFinderService,
	) {}

	async archive(
		user: User,
		workflowIds: string[],
		clientId?: string,
	): Promise<BulkWorkflowActionResult> {
		const workflows = await this.preflight(user, workflowIds, ['workflow:delete'], {
			action: 'archive',
			clientId,
			validate: (workflow) =>
				workflow.isArchived
					? {
							workflowId: workflow.id,
							reason: 'alreadyArchived',
							message: 'Workflow is already archived.',
						}
					: undefined,
		});

		return await this.execute(workflows, async (workflow) => {
			const archived = await this.workflowService.archive(user, workflow.id);
			if (!archived) throw new NotFoundError('Workflow is no longer accessible.');

			await this.collaborationService.broadcastWorkflowUpdate(workflow.id, user.id);
			return { status: 'completed' };
		});
	}

	async delete(
		user: User,
		workflowIds: string[],
		clientId?: string,
	): Promise<BulkWorkflowActionResult> {
		const uniqueIds = this.uniqueIds(workflowIds);
		const pendingPublishedIds =
			await this.workflowPublishedVersionRepository.getWorkflowIdsWithPublishedVersion(uniqueIds);
		const workflows = await this.preflight(user, uniqueIds, ['workflow:delete'], {
			action: 'delete',
			clientId,
			validate: (workflow) => {
				if (!workflow.isArchived) {
					return {
						workflowId: workflow.id,
						reason: 'notArchived',
						message: 'Workflow must be archived before it can be deleted.',
					};
				}
				if (workflow.activeVersionId !== null) {
					return {
						workflowId: workflow.id,
						reason: 'published',
						message: 'Cannot delete a published workflow. Unpublish it before deleting.',
					};
				}
				if (pendingPublishedIds.has(workflow.id)) {
					return {
						workflowId: workflow.id,
						reason: 'unpublishPending',
						message: 'Workflow is still being unpublished.',
					};
				}
				return undefined;
			},
		});

		return await this.execute(workflows, async (workflow) => {
			const deleted = await this.workflowService.delete(user, workflow.id);
			if (!deleted) throw new NotFoundError('Workflow is no longer accessible.');
			return { status: 'completed' };
		});
	}

	async unpublish(
		user: User,
		workflowIds: string[],
		clientId?: string,
	): Promise<BulkWorkflowActionResult> {
		const workflows = await this.preflight(user, workflowIds, ['workflow:unpublish'], {
			action: 'unpublish',
			clientId,
		});

		return await this.execute(workflows, async (workflow) => {
			if (workflow.activeVersionId === null) return { status: 'unchanged' };

			await this.workflowService.deactivateWorkflow(user, workflow.id);
			await this.collaborationService.broadcastWorkflowUpdate(workflow.id, user.id);
			return { status: 'completed' };
		});
	}

	async transfer(
		user: User,
		workflowIds: string[],
		destinationProjectId: string,
		shareCredentials: string[] = [],
		destinationParentFolderId?: string,
		clientId?: string,
	): Promise<BulkWorkflowActionResult> {
		const destinationProject = await this.projectService.getProjectWithScope(
			user,
			destinationProjectId,
			['workflow:create'],
		);
		if (!destinationProject) {
			throw this.preflightError([
				{
					reason: 'destinationNotFoundOrForbidden',
					message: 'The destination project does not exist or is not accessible.',
				},
			]);
		}

		if (destinationParentFolderId) {
			try {
				await this.folderRepository.findOneOrFailFolderInProject(
					destinationParentFolderId,
					destinationProjectId,
				);
			} catch {
				throw this.preflightError([
					{
						reason: 'destinationFolderNotFound',
						message: 'The destination folder does not exist in the destination project.',
					},
				]);
			}
		}

		const workflows = await this.preflight(user, workflowIds, ['workflow:move'], {
			action: 'transfer',
			clientId,
			includeParentFolder: true,
			includeShared: true,
			validate: (workflow) => {
				const ownerSharing = workflow.shared.find((sharing) => sharing.role === 'workflow:owner');
				if (!ownerSharing) {
					return {
						workflowId: workflow.id,
						reason: 'ownerMissing',
						message: 'Workflow does not have an owner project.',
					};
				}

				if (
					ownerSharing.project.id === destinationProjectId &&
					workflow.parentFolder?.id === destinationParentFolderId
				) {
					return {
						workflowId: workflow.id,
						reason: 'sameDestination',
						message: 'Workflow already belongs to the requested destination.',
					};
				}
				return undefined;
			},
		});

		const shareableCredentialIds = await this.getShareableCredentialIds(user, shareCredentials);
		const shareableCredentialIdSet = new Set(shareableCredentialIds);
		const unsharedCredentialIds = this.uniqueIds(shareCredentials).filter(
			(id) => !shareableCredentialIdSet.has(id),
		);

		const result = await this.execute(workflows, async (workflow) => {
			const activationError = await this.enterpriseWorkflowService.transferWorkflow(
				user,
				workflow.id,
				destinationProjectId,
				shareableCredentialIds,
				destinationParentFolderId,
			);

			return activationError
				? {
						status: 'completed',
						reason: 'reactivationFailed',
						message: 'Workflow was moved but could not be reactivated.',
					}
				: { status: 'completed' };
		});

		return { ...result, unsharedCredentialIds };
	}

	private async preflight(
		user: User,
		workflowIds: string[],
		scopes: Scope[],
		options: PreflightOptions,
	): Promise<WorkflowEntity[]> {
		const uniqueIds = this.uniqueIds(workflowIds);
		const accessibleWorkflows = await this.workflowFinderService.findWorkflowsByIdsForUser(
			uniqueIds,
			user,
			scopes,
			{
				includeParentFolder: options.includeParentFolder,
				includeShared: options.includeShared,
			},
		);
		const workflowById = new Map(accessibleWorkflows.map((workflow) => [workflow.id, workflow]));
		const issues: PreflightIssue[] = [];

		for (const workflowId of uniqueIds) {
			const workflow = workflowById.get(workflowId);
			if (!workflow) {
				issues.push({
					workflowId,
					reason: 'notFoundOrForbidden',
					message: 'Workflow does not exist or is not accessible.',
				});
				continue;
			}

			try {
				await this.collaborationService.validateWriteLock(
					user.id,
					options.clientId,
					workflowId,
					options.action,
				);
			} catch (error) {
				issues.push({
					workflowId,
					reason: 'locked',
					message: ensureError(error).message,
				});
				continue;
			}

			const issue = options.validate?.(workflow);
			if (issue) issues.push(issue);
		}

		if (issues.length > 0) throw this.preflightError(issues);

		return uniqueIds.map((id) => workflowById.get(id)).filter((workflow) => workflow !== undefined);
	}

	private async execute(
		workflows: WorkflowEntity[],
		executeItem: ExecuteItem,
	): Promise<BulkWorkflowActionResult> {
		const results: BulkWorkflowActionResultItem[] = [];

		for (let start = 0; start < workflows.length; start += LIFECYCLE_BATCH_SIZE) {
			const batch = workflows.slice(start, start + LIFECYCLE_BATCH_SIZE);
			const batchResults = await Promise.all(
				batch.map(async (workflow): Promise<BulkWorkflowActionResultItem> => {
					try {
						return { workflowId: workflow.id, ...(await executeItem(workflow)) };
					} catch (error) {
						return {
							workflowId: workflow.id,
							status: 'failed',
							reason: 'runtimeFailure',
							message: ensureError(error).message,
						};
					}
				}),
			);
			results.push(...batchResults);

			if (batchResults.some(({ status }) => status === 'failed')) {
				results.push(
					...workflows.slice(start + batch.length).map(({ id }) => ({
						workflowId: id,
						status: 'notAttempted' as const,
					})),
				);
				return { status: 'partial', results };
			}
		}

		return { status: 'completed', results };
	}

	private async getShareableCredentialIds(user: User, credentialIds: string[]): Promise<string[]> {
		const uniqueIds = this.uniqueIds(credentialIds);
		if (hasGlobalScope(user, ['credential:share'], { mode: 'allOf' })) return uniqueIds;

		const accessibleIds = new Set(
			await this.credentialsFinderService.getCredentialIdsByUserAndRole([user.id], {
				scopes: ['credential:share'],
			}),
		);
		return uniqueIds.filter((id) => accessibleIds.has(id));
	}

	private uniqueIds(ids: string[]): string[] {
		return [...new Set(ids)];
	}

	private preflightError(issues: PreflightIssue[]): UnprocessableRequestError {
		return new UnprocessableRequestError('Bulk workflow action preflight failed', undefined, {
			issues,
		});
	}
}
