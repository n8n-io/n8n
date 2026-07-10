import type { User } from '@n8n/db';
import { DataTableCliBridge } from '@n8n/data-table';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';

import { EventService } from '@/events/event.service';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { userHasScopes } from '@/permissions.ee/check-access';
import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';
import { Telemetry } from '@/telemetry';

/**
 * cli-side implementation of the data-table module's dependency-inversion seam.
 * Bound to the abstract `DataTableCliBridge` token via a pre-init hook (see
 * `modules/module-bridges.ts`) so the module can stay free of any cli import.
 */
@Service()
export class DataTableCliBridgeImpl extends DataTableCliBridge {
	constructor(
		private readonly ownershipService: OwnershipService,
		private readonly projectService: ProjectService,
		private readonly roleService: RoleService,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
		private readonly eventService: EventService,
		private readonly telemetry: Telemetry,
	) {
		super();
	}

	async getWorkflowProjectId(workflowId: string): Promise<string> {
		const project = await this.ownershipService.getWorkflowProjectCached(workflowId);
		return project.id;
	}

	async hasProjectScope(user: User, scope: Scope, projectId: string): Promise<boolean> {
		return await userHasScopes(user, [scope], false, { projectId });
	}

	isBranchReadOnly(): boolean {
		return this.sourceControlPreferencesService.getPreferences().branchReadOnly;
	}

	async getUserProjectIds(user: User): Promise<string[]> {
		const relations = await this.projectService.getProjectRelationsForUser(user);
		return relations.map((relation) => relation.projectId);
	}

	async assertProjectExists(projectId: string): Promise<void> {
		await this.projectService.getProject(projectId);
	}

	async rolesWithProjectScope(scopes: Scope[]): Promise<string[]> {
		return await this.roleService.rolesWithScope('project', scopes);
	}

	emitDataTableDeleted(payload: { dataTableId: string; projectId: string }): void {
		this.eventService.emit('data-table-deleted', payload);
	}

	trackStorageLimitHit(totalBytes: number, maxBytes: number): void {
		this.telemetry.track('User hit data table storage limit', {
			total_bytes: totalBytes,
			max_bytes: maxBytes,
		});
	}
}
