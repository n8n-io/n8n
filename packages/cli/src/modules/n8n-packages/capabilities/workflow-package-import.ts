import { EventService } from '@n8n/backend-services';
import type { Project, User, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { runSerially } from '@n8n/utils/run-serially';

import { NodeTypes } from '@/node-types';
import { ProjectService } from '@/services/project.service.ee';

import { decodeBase64WithinLimit, type PackageSizeLimit } from './base64-limits';
import {
	assertNoArchivedWorkflow,
	type ImportedWorkflowPackage,
	singleWorkflowEntry,
	summariseImport,
} from './package-requirements';
import { classifyWorkflowPackageFailure } from './package-tool-error';
import { N8nPackageParser } from '../engine/n8n-package-parser';
import { collectMissingNodeTypes } from '../entities/workflow/missing-node-type-mode';
import { WorkflowImportMatchService } from '../entities/workflow/workflow-import-match.service';
import { TarPackageReader } from '../io/tar/tar-package-reader';
import { PackageImportConfig } from '../n8n-packages.config';
import { N8nPackagesService } from '../n8n-packages.service';
import type { ImportPackageRequest } from '../n8n-packages.types';

/**
 * Fixed options of a one-workflow import. A re-import of the same package updates the workflow
 * that the first import created (lineage through `sourceWorkflowId`). A credential that the
 * target does not have becomes an empty stub that the user sets up. The import creates no tags
 * and no data tables: it reports them, so that the user creates them on purpose.
 */
export const WORKFLOW_PACKAGE_IMPORT_POLICY = {
	credentialMatchingMode: 'name-and-type',
	credentialMissingMode: 'create-stub',
	workflowConflictPolicy: 'new-version',
	workflowIdPolicy: 'new',
	// A new workflow stays unpublished. A re-import keeps a published workflow published.
	workflowPublishingPolicy: 'preserve-published-state',
	// The result lists missing node types, and such a workflow is never published.
	missingNodeTypeMode: 'import-anyway',
	// The import rejects project and folder packages first, so these two never apply.
	projectConflictPolicy: 'fail',
	overwriteDeletionPolicy: 'archive',
	dataTableMatchingMode: 'by-id',
	dataTableMissingMode: 'do-nothing',
	dataTableSchemaConflictPolicy: 'keep-existing',
	// The export leaves out variable values, and creating variables needs a licence.
	variableMissingMode: 'do-nothing',
	variableConflictPolicy: 'keep-existing',
	tagMissingMode: 'do-nothing',
	tagConflictPolicy: 'skip',
} as const satisfies Omit<
	ImportPackageRequest,
	| 'user'
	| 'packageBuffer'
	| 'projectId'
	| 'folderId'
	| 'bindings'
	| 'apiKeyScopes'
	| 'selection'
	| 'folderConflictPolicy'
	| 'variableParentPolicy'
>;

/** Rules of the caller's surface for the workflow that an import writes. */
export type WorkflowPackageImportRules = {
	/** Throws when the surface must not change this workflow, which the import would update. */
	assertUpdatable: (workflow: WorkflowEntity) => void;
	/** Runs after a successful import. Gives warnings for the result. */
	afterImport?: (user: User, workflowId: string) => Promise<string[]>;
};

export type WorkflowPackageImportRequest = {
	user: User;
	packageBase64: string;
	limit: PackageSizeLimit;
	/** Defaults to the personal project of the user. */
	projectId?: string;
	/** When set, the import fails unless the package holds this source workflow. */
	sourceWorkflowId?: string;
	rules?: WorkflowPackageImportRules;
};

/**
 * Imports of the same source workflow into the same project run one at a time, so that a retry
 * updates the workflow that the first call created instead of creating a second one. The queue
 * is in this process only.
 */
const importsInProgress = new Map<string, Promise<unknown>>();

async function readPackage(packageBuffer: Buffer, expectedSourceWorkflowId?: string) {
	const parser = Container.get(N8nPackageParser);
	const reader = new TarPackageReader(packageBuffer, Container.get(PackageImportConfig));
	const manifest = await parser.getManifest(reader);
	const entry = singleWorkflowEntry(manifest, expectedSourceWorkflowId);
	const workflows = await parser.getWorkflows(reader);
	assertNoArchivedWorkflow(workflows);
	const nodeTypes = Container.get(NodeTypes);
	const missingNodeTypes = collectMissingNodeTypes(workflows, (type) =>
		nodeTypes.getSupportedVersions(type),
	);
	return { manifest, entry, missingNodeTypes };
}

/**
 * The project to import into. The check comes before any workflow lookup, so that an import
 * does not show what a project holds to a user who cannot import into it.
 */
async function resolveTargetProject(user: User, projectId: string | undefined): Promise<Project> {
	const projectService = Container.get(ProjectService);
	if (projectId === undefined) {
		const personalProject = await projectService.getPersonalProject(user);
		if (!personalProject) throw new NotFoundError('Personal project not found');
		return personalProject;
	}
	const project = await projectService.getProjectWithScope(user, projectId, [
		'workflow:import',
		'workflow:create',
	]);
	if (!project) {
		throw new ForbiddenError(
			'The project does not exist, or you do not have permission to create workflows in it.',
		);
	}
	return project;
}

/** Applies the rules of the surface to the workflow that the import would update. */
async function assertMatchUpdatable(
	projectId: string,
	sourceWorkflowId: string,
	rules: WorkflowPackageImportRules,
): Promise<void> {
	const { matches, lineageConflicts } = await Container.get(
		WorkflowImportMatchService,
	).findBySourceWorkflowIds(projectId, [sourceWorkflowId]);
	// With more than one match, the import stops with a conflict before it writes anything.
	if (lineageConflicts.length > 0) return;
	const existing = matches.get(sourceWorkflowId);
	if (existing) rules.assertUpdatable(existing);
}

async function writeWorkflowPackage(
	request: WorkflowPackageImportRequest,
): Promise<ImportedWorkflowPackage> {
	const { user, rules } = request;
	const packageBuffer = decodeBase64WithinLimit(request.packageBase64, request.limit);
	const { manifest, entry, missingNodeTypes } = await readPackage(
		packageBuffer,
		request.sourceWorkflowId,
	);
	const project = await resolveTargetProject(user, request.projectId);
	return await runSerially(importsInProgress, `${project.id}:${entry.id}`, async () => {
		if (rules) await assertMatchUpdatable(project.id, entry.id, rules);
		const result = await Container.get(N8nPackagesService).importPackage({
			user,
			packageBuffer,
			projectId: project.id,
			...WORKFLOW_PACKAGE_IMPORT_POLICY,
		});
		const summary = summariseImport({
			result,
			sourceWorkflowId: entry.id,
			requirements: manifest.requirements,
			missingNodeTypes,
		});
		const extraWarnings = (await rules?.afterImport?.(user, summary.workflowId)) ?? [];
		return { ...summary, warnings: [...summary.warnings, ...extraWarnings] };
	});
}

/**
 * Imports a package (base64) of one workflow into a project that the user can create workflows
 * in. Every surface uses it: the caller gives the rules of its surface. Writes the audit event
 * of a failure. The package service writes the event of a success.
 */
export async function importWorkflowPackage(
	request: WorkflowPackageImportRequest,
): Promise<ImportedWorkflowPackage> {
	try {
		return await writeWorkflowPackage(request);
	} catch (error) {
		Container.get(EventService).emit('n8n-package-import-failed', {
			user: request.user,
			reason: classifyWorkflowPackageFailure(error),
			...(request.projectId ? { projectId: request.projectId } : {}),
		});
		throw error;
	}
}
