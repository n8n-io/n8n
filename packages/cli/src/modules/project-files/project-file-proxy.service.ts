import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import {
	NodeOperationError,
	type INode,
	type IProjectFileWriteService,
	type ProjectFileNodeInput,
	type ProjectFileNodeOutput,
	type ProjectFileProxyProvider,
	type Workflow,
} from 'n8n-workflow';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { OwnershipService } from '@/services/ownership.service';

import { ProjectFileConcurrentModificationError } from './errors/project-file-concurrent-modification.error';
import { ProjectFileNameConflictError } from './errors/project-file-name-conflict.error';
import { ProjectFileQuotaExceededError } from './errors/project-file-quota-exceeded.error';
import { ProjectFileTooLargeError } from './errors/project-file-too-large.error';
import type { ProjectFile } from './project-file.entity';
import { ProjectFileService } from './project-file.service';
import type { ProjectFileActor } from './project-files.types';

const ALLOWED_NODES = ['n8n-nodes-base.projectFile'] as const;

type AllowedNode = (typeof ALLOWED_NODES)[number];

export function isAllowedNode(s: string): s is AllowedNode {
	return ALLOWED_NODES.includes(s as AllowedNode);
}

/**
 * Bridges the project-files module to the node that writes files from inside a
 * workflow. Published into workflow context by `ProjectFilesModule.context()`.
 *
 * The project is always the one that owns the executing workflow — there is no
 * project parameter on the node, so a workflow cannot write to another project's
 * files, and no per-execution scope check is needed.
 */
@Service()
export class ProjectFileProxyService implements ProjectFileProxyProvider {
	constructor(
		private readonly projectFileService: ProjectFileService,
		private readonly ownershipService: OwnershipService,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('project-files');
	}

	async getProjectFileProxy(workflow: Workflow, node: INode): Promise<IProjectFileWriteService> {
		if (!isAllowedNode(node.type)) {
			throw new Error('This proxy is only available for the Project File node');
		}

		const projectId = await this.resolveProjectId(workflow, node);
		const actor: ProjectFileActor = { type: 'workflow', workflowId: workflow.id };

		return {
			addFile: async (file: ProjectFileNodeInput, options): Promise<ProjectFileNodeOutput> => {
				this.checkInstanceWriteAccess();

				try {
					const { file: stored, overwritten } = await this.projectFileService.store(
						projectId,
						actor,
						file,
						{ overwrite: options?.overwrite ?? true },
					);

					return { ...toNodeOutput(stored), overwritten };
				} catch (error) {
					throw this.toNodeError(node, error);
				}
			},
		};
	}

	private checkInstanceWriteAccess(): void {
		const preferences = this.sourceControlPreferencesService.getPreferences();

		if (preferences.branchReadOnly) {
			throw new ForbiddenError(
				'Cannot modify project files on a protected instance. This instance is in read-only mode.',
			);
		}
	}

	/**
	 * An unsaved workflow has no owner row, so this is also what stops an
	 * unpersisted workflow id from reaching the `createdByWorkflowId` FK.
	 */
	private async resolveProjectId(workflow: Workflow, node: INode): Promise<string> {
		try {
			const project = await this.ownershipService.getWorkflowProjectCached(workflow.id);

			return project.id;
		} catch (error) {
			this.logger.warn('Could not resolve the project owning the workflow', {
				workflowId: workflow.id,
				error,
			});

			throw new NodeOperationError(node, 'Could not find the project this workflow belongs to', {
				description: 'Save the workflow before writing files to its project.',
			});
		}
	}

	/** Module errors carry good messages; a node also needs context and a next step. */
	private toNodeError(node: INode, error: unknown): unknown {
		if (error instanceof ProjectFileNameConflictError) {
			return new NodeOperationError(node, error.message, {
				description:
					"Turn on 'Replace Existing File' to overwrite it, or give the file a unique name.",
			});
		}

		if (error instanceof ProjectFileQuotaExceededError) {
			return new NodeOperationError(node, error.message, {
				description:
					"Delete files from the project's Files tab, or raise the storage limit for this instance.",
			});
		}

		if (error instanceof ProjectFileTooLargeError) {
			return new NodeOperationError(node, error.message, {
				description:
					'Raise N8N_PROJECT_FILES_MAX_FILE_SIZE_BYTES to store files this large, or shrink the file.',
			});
		}

		if (error instanceof ProjectFileConcurrentModificationError) {
			return new NodeOperationError(node, error.message, {
				description: 'Another write to this file landed first. Retry the node.',
			});
		}

		return error;
	}
}

/**
 * Node output is visible in the NDV and persisted in execution data, so the
 * binary data reference is dropped here — it must never leave the server.
 */
function toNodeOutput(file: ProjectFile): Omit<ProjectFileNodeOutput, 'overwritten'> {
	return {
		id: file.id,
		name: file.name,
		mimeType: file.mimeType,
		fileSizeBytes: file.fileSizeBytes,
		projectId: file.projectId,
		createdAt: file.createdAt.toISOString(),
		updatedAt: file.updatedAt.toISOString(),
	};
}
