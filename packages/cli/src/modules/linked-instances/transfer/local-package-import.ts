import { Logger } from '@n8n/backend-common';
import type { User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';

import { McpSettingsService } from '@/modules/mcp/mcp.settings.service';
import type { ImportedWorkflowPackage } from '@/modules/n8n-packages/capabilities/import-summary';
import { instanceMcpPackageSizeLimit } from '@/modules/n8n-packages/capabilities/mcp-package-size-limit';
import {
	importWorkflowPackage,
	type WorkflowPackageImportRules,
} from '@/modules/n8n-packages/capabilities/workflow-package-import';
import { ProjectService } from '@/services/project.service.ee';

import { TRANSFER_MESSAGES, TRANSFER_WARNINGS } from './transfer-errors';

export type LocalImportArgs = {
	packageBase64: string;
	/** Defaults to the personal project of the user. */
	projectId?: string;
	/** The id of the workflow in the linked instance. The import refuses a package without it. */
	sourceWorkflowId: string;
};

/**
 * Sets the MCP access of the workflow that a pull wrote.
 * @param previous the MCP access of the workflow before the pull, `undefined` for a new workflow
 * @returns warnings
 */
export type SetPulledMcpAccess = (
	user: User,
	workflowId: string,
	previous: boolean | undefined,
) => Promise<string[]>;

/**
 * A pull updates only the workflow of an earlier pull of the same workflow. The import also
 * matches a workflow without a source by its own ID, and such a workflow was made here. An
 * archived workflow stays as it is: the user restores it first.
 */
export function assertUpdatableByPull(workflow: WorkflowEntity): void {
	if (!workflow.sourceWorkflowId) {
		throw new BadRequestError(TRANSFER_MESSAGES.sameIdLocalWorkflow(workflow.name));
	}
	if (workflow.isArchived) {
		throw new BadRequestError(TRANSFER_MESSAGES.archivedLocalCopy(workflow.name));
	}
}

/**
 * The rules of one pull for the workflow that it writes. The linked instance sends only workflows
 * that are available in MCP there, so every package says "available". The MCP access of the
 * workflow here therefore comes from this instance, not from the package.
 */
export function pullImportRules(setMcpAccess: SetPulledMcpAccess): WorkflowPackageImportRules {
	// The import gives `assertUpdatable` the workflow that it updates, before it writes.
	let previous: boolean | undefined;
	return {
		assertUpdatable: (workflow) => {
			assertUpdatableByPull(workflow);
			previous = workflow.settings?.availableInMCP === true;
		},
		afterImport: async (user, workflowId) => await setMcpAccess(user, workflowId, previous),
	};
}

/** Imports the workflow of a pull into this instance, checked as the acting user. */
@Service()
export class LocalPackageImport {
	constructor(
		private readonly projectService: ProjectService,
		private readonly mcpSettings: McpSettingsService,
		private readonly logger: Logger,
	) {}

	/**
	 * The import checks the same scopes. This check comes before any request to the linked instance.
	 * @throws {ForbiddenError} when the user cannot import workflows into the project
	 */
	async assertCanImportInto(user: User, projectId: string | undefined): Promise<void> {
		// The personal project of the user is the default, and its owner can import into it.
		if (projectId === undefined) return;
		const project = await this.projectService.getProjectWithScope(user, projectId, [
			'workflow:import',
			'workflow:create',
		]);
		if (!project) throw new ForbiddenError(TRANSFER_MESSAGES.cannotCreateInProject);
	}

	async importPackage(user: User, args: LocalImportArgs): Promise<ImportedWorkflowPackage> {
		return await importWorkflowPackage({
			user,
			packageBase64: args.packageBase64,
			limit: instanceMcpPackageSizeLimit(),
			projectId: args.projectId,
			sourceWorkflowId: args.sourceWorkflowId,
			rules: pullImportRules(
				async (owner, workflowId, previous) => await this.setMcpAccess(owner, workflowId, previous),
			),
		});
	}

	/**
	 * A new workflow gets the setting of this instance for new workflows. An updated workflow keeps
	 * the MCP access that it had here.
	 */
	private async setMcpAccess(
		user: User,
		workflowId: string,
		previous: boolean | undefined,
	): Promise<string[]> {
		const availableInMCP = previous ?? (await this.mcpAccessOfNewWorkflows());
		try {
			const { changedWorkflows, updatedCount, unchangedCount } =
				await this.mcpSettings.bulkSetAvailableInMCP(user, {
					workflowIds: [workflowId],
					availableInMCP,
				});
			void this.mcpSettings.broadcastWorkflowMCPAvailabilityChanged(changedWorkflows);
			if (updatedCount + unchangedCount > 0) return [];
		} catch (error) {
			this.logger.warn('Could not set the MCP access of a workflow from a linked instance', {
				workflowId,
				error: getErrorMessage(error),
			});
		}
		return [TRANSFER_WARNINGS.mcpAccessNotSet];
	}

	/** When the setting cannot be read, the workflow is not available in MCP, as at create. */
	private async mcpAccessOfNewWorkflows(): Promise<boolean> {
		try {
			return await this.mcpSettings.getAutoExposeNewWorkflows();
		} catch (error) {
			this.logger.warn('Could not read the MCP access setting for new workflows', {
				error: getErrorMessage(error),
			});
			return false;
		}
	}
}
