import type { BreakingChangeVersion } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { UrlService, WorkflowSharingService } from '@n8n/backend-services';
import { WorkflowRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';

import { CollaborationService } from '@/collaboration/collaboration.service';
import { BreakingChangeMigrationService } from '@/modules/breaking-changes/breaking-changes.migration.service';
import { MigrationRegistry } from '@/modules/breaking-changes/breaking-changes.migration-registry.service';
import { RuleRegistry } from '@/modules/breaking-changes/breaking-changes.rule-registry.service';
import { MigrationFindingQueryService } from '@/modules/breaking-changes/query/migration-finding-query.service';
import { MigrationFindingSyncService } from '@/modules/breaking-changes/sync/migration-finding-sync.service';
import { MigrationFindingTriageService } from '@/modules/breaking-changes/triage/migration-finding-triage.service';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { RegisterToolFn } from '../../mcp.types';
import { createGetMigrationFindingsTool } from './get-migration-findings.tool';
import { createGetMigrationReportTool } from './get-migration-report.tool';
import { createMigrateWorkflowTool } from './migrate-workflow.tool';
import {
	readWorkflowMigrationFindings,
	type MigrationReportToolDeps,
	type ReadWorkflowMigrationFindings,
} from './migration-report.utils';
import { createSetMigrationFindingStatusTool } from './set-migration-finding-status.tool';

const resolveDeps = (targetVersion: BreakingChangeVersion): MigrationReportToolDeps => ({
	targetVersion,
	ruleRegistry: Container.get(RuleRegistry),
	migrationRegistry: Container.get(MigrationRegistry),
	syncService: Container.get(MigrationFindingSyncService),
	queryService: Container.get(MigrationFindingQueryService),
	triageService: Container.get(MigrationFindingTriageService),
	migrationService: Container.get(BreakingChangeMigrationService),
	workflowSharingService: Container.get(WorkflowSharingService),
	workflowRepository: Container.get(WorkflowRepository),
	workflowFinderService: Container.get(WorkflowFinderService),
	collaborationService: Container.get(CollaborationService),
	urlService: Container.get(UrlService),
	telemetry: Container.get(Telemetry),
	logger: Container.get(Logger).scoped('mcp'),
});

/**
 * Registers the migration report tools for a user who may read the report. The
 * built-in fixes and finding statuses need `breakingChanges:migrate`, like their
 * REST routes, so only owners and admins get those two.
 */
export function registerMigrationReportTools(
	registerTool: RegisterToolFn,
	user: User,
	targetVersion: BreakingChangeVersion,
): void {
	const deps = resolveDeps(targetVersion);

	registerTool(createGetMigrationReportTool(user, deps));
	registerTool(createGetMigrationFindingsTool(user, deps));

	if (hasGlobalScope(user, 'breakingChanges:migrate')) {
		registerTool(createMigrateWorkflowTool(user, deps));
		registerTool(createSetMigrationFindingStatusTool(user, deps));
	}
}

/** The reader update_workflow uses to report the findings of the workflow it saved. */
export function createWorkflowMigrationFindingsReader(
	targetVersion: BreakingChangeVersion,
): ReadWorkflowMigrationFindings {
	const deps = resolveDeps(targetVersion);
	return async (workflowId) => await readWorkflowMigrationFindings(deps, workflowId);
}
