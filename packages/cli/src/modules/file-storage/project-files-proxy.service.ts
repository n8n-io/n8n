import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import {
	INode,
	IProjectFilesService,
	ListProjectFilesOptions,
	NodeOperationError,
	ProjectFileMetadata,
	ProjectFilesConflictMode,
	ProjectFilesOperation,
	ProjectFilesProxyProvider,
	Workflow,
} from 'n8n-workflow';
import type { Readable } from 'node:stream';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { OwnershipService } from '@/services/ownership.service';
import { Telemetry } from '@/telemetry';

import { FileStorageValidationError } from './errors/file-storage-validation.error';
import { ProjectFileNameConflictError } from './errors/project-file-name-conflict.error';
import { ProjectFileNotFoundError } from './errors/project-file-not-found.error';
import { ProjectFileService } from './file-storage.service';
import type { ProjectFile } from './project-file.entity';

const ALLOWED_NODES = ['n8n-nodes-base.files', 'n8n-nodes-base.filesTool'] as const;

type AllowedNode = (typeof ALLOWED_NODES)[number];

export function isAllowedNode(s: string): s is AllowedNode {
	return ALLOWED_NODES.includes(s as AllowedNode);
}

const toMetadata = (file: ProjectFile): ProjectFileMetadata => ({
	id: file.id,
	name: file.name,
	mimeType: file.mimeType,
	sizeBytes: file.fileSizeBytes,
	createdAt: file.createdAt,
	updatedAt: file.updatedAt,
});

/**
 * The Files node's path to the backend. Node executions carry no User, so
 * authorization is the node allowlist plus home-project resolution (plus the
 * instance write-access guard on mutations) — there are no per-user scope
 * re-checks on this path, matching the data-table precedent. A user-bound
 * operations factory arrives with MCP tools.
 */
@Service()
export class ProjectFilesProxyService implements ProjectFilesProxyProvider {
	/** first-use-per-workflow tracking for the node-executed event (per instance runtime). */
	private readonly trackedExecutions = new Set<string>();

	constructor(
		private readonly projectFileService: ProjectFileService,
		private readonly ownershipService: OwnershipService,
		private readonly logger: Logger,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
		private readonly telemetry: Telemetry,
	) {
		this.logger = this.logger.scoped('file-storage');
	}

	private trackFirstUse(workflowId: string, operation: ProjectFilesOperation): void {
		const key = `${workflowId}:${operation}`;
		if (this.trackedExecutions.has(key)) return;
		if (this.trackedExecutions.size > 10_000) this.trackedExecutions.clear();
		this.trackedExecutions.add(key);
		this.telemetry.track(TELEMETRY_EVENT.FILES.FILES_NODE_EXECUTED, { operation });
	}

	private checkInstanceWriteAccess(): void {
		const preferences = this.sourceControlPreferencesService.getPreferences();
		if (preferences.branchReadOnly) {
			throw new ForbiddenError(
				'Cannot modify files on a protected instance. This instance is in read-only mode.',
			);
		}
	}

	private validateRequest(node: INode) {
		if (!isAllowedNode(node.type)) {
			throw new Error('This proxy is only available for Files nodes');
		}
	}

	private async getProjectId(workflow: Workflow) {
		const homeProject = await this.ownershipService.getWorkflowProjectCached(workflow.id);
		return homeProject.id;
	}

	async getProjectFilesProxy(
		workflow: Workflow,
		node: INode,
		projectId?: string,
	): Promise<IProjectFilesService> {
		this.validateRequest(node);
		projectId = projectId ?? (await this.getProjectId(workflow));

		return this.makeProjectFilesOperations(projectId, node, workflow.id);
	}

	private makeProjectFilesOperations(
		projectId: string,
		node: INode,
		workflowId: string,
	): IProjectFilesService {
		const projectFileService = this.projectFileService;
		const checkInstanceWriteAccess = () => this.checkInstanceWriteAccess();
		const trackFirstUse = (operation: ProjectFilesOperation) =>
			this.trackFirstUse(workflowId, operation);
		const asNodeError = (error: unknown): never => {
			if (
				error instanceof ProjectFileNotFoundError ||
				error instanceof ProjectFileNameConflictError ||
				error instanceof FileStorageValidationError
			) {
				throw new NodeOperationError(node, error.message);
			}
			throw error;
		};

		return {
			getProjectId() {
				return projectId;
			},

			async getManyAndCount(options: ListProjectFilesOptions = {}) {
				trackFirstUse('getMany');
				const { count, data } = await projectFileService.getManyAndCount({
					skip: options.skip,
					take: options.take,
					// The service sorts the denormalized byte count under the `size` key
					sortBy: options.sortBy?.replace(/^sizeBytes:/, 'size:') as never,
					filter: { ...(options.filter ?? {}), projectId },
				});
				return { count, data: data.map(toMetadata) };
			},

			async findByName(name: string) {
				const file = await projectFileService.findByNameInProject(name, projectId);
				return file === null ? null : toMetadata(file);
			},

			async download(fileId: string) {
				trackFirstUse('download');
				try {
					const { file, stream } = await projectFileService.download(fileId, projectId);
					return { metadata: toMetadata(file), stream };
				} catch (error) {
					return asNodeError(error);
				}
			},

			async upload(
				name: string,
				data: Readable | Buffer,
				meta: { mimeType?: string },
				conflictMode: ProjectFilesConflictMode,
			) {
				checkInstanceWriteAccess();
				trackFirstUse('upload');
				try {
					const file = await projectFileService.upload(
						projectId,
						data,
						{ name, mimeType: meta.mimeType ?? 'application/octet-stream' },
						conflictMode,
						'node-write',
					);
					return toMetadata(file);
				} catch (error) {
					return asNodeError(error);
				}
			},

			async deleteFile(fileId: string) {
				checkInstanceWriteAccess();
				trackFirstUse('deleteFile');
				try {
					const file = await projectFileService.deleteFile(fileId, projectId);
					return { name: file.name };
				} catch (error) {
					return asNodeError(error);
				}
			},
		};
	}
}
