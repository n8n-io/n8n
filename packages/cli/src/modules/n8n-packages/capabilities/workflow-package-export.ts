import { EventService } from '@n8n/backend-services';
import type { User, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';

import { collectWithinLimit, type PackageSizeLimit } from './base64-limits';
import {
	assertNoSubWorkflowCalls,
	notCopiedWorkflowWarnings,
	summariseRequirements,
	type WorkflowPackageRequirements,
} from './package-requirements';
import { classifyWorkflowPackageFailure } from './package-tool-error';
import { TarPackageWriter } from '../io/tar/tar-package-writer';
import { N8nPackagesService } from '../n8n-packages.service';
import {
	CredentialExportPolicy,
	MissingWorkflowDependencyPolicy,
	type ExportPackageEventCounts,
	type ExportPackageRequest,
} from '../n8n-packages.types';
import type { PackageManifest } from '../spec/manifest.schema';

/** The workflow to export, as the caller found it with the access rules of its surface. */
export type PackageSourceWorkflow = Pick<WorkflowEntity, 'id' | 'name' | 'nodes' | 'settings'>;

export type WorkflowPackageExportRequest = {
	user: User;
	workflowId: string;
	/** Finds the workflow with the rules of the caller's surface, for example MCP access. */
	findWorkflow: (workflowId: string) => Promise<PackageSourceWorkflow>;
	limit: PackageSizeLimit;
};

export type ExportedWorkflowPackage = {
	packageBase64: string;
	workflowName: string;
	sizeBytes: number;
	requirements: WorkflowPackageRequirements;
	/** What the package does not copy, for example the error workflow. */
	warnings: string[];
};

/**
 * Fixed options of a one-workflow export. The package has no credential data and no variable
 * values. A workflow that the package refers to stays a reference: only the error workflow can
 * be one, because the export stops for sub-workflow calls first.
 */
export const WORKFLOW_PACKAGE_EXPORT_OPTIONS = {
	credentialExportPolicy: CredentialExportPolicy.NoValues,
	includeVariableValues: false,
	missingWorkflowDependencyPolicy: MissingWorkflowDependencyPolicy.ReferenceOnly,
} as const satisfies Partial<ExportPackageRequest>;

function exportedEvent(user: User, manifest: PackageManifest, counts: ExportPackageEventCounts) {
	const workflowIds = (manifest.workflows ?? []).map(({ id }) => id);
	return {
		user,
		...(workflowIds.length > 0 ? { workflowIds } : {}),
		counts,
		credentialExportPolicy: WORKFLOW_PACKAGE_EXPORT_OPTIONS.credentialExportPolicy,
		includeArchivedWorkflows: false,
	};
}

function errorWorkflowIdOf(workflow: PackageSourceWorkflow): string | undefined {
	const errorWorkflow = workflow.settings?.errorWorkflow;
	return typeof errorWorkflow === 'string' ? errorWorkflow : undefined;
}

async function writeWorkflowPackage(
	request: WorkflowPackageExportRequest,
): Promise<ExportedWorkflowPackage> {
	const { user, limit } = request;
	const workflow = await request.findWorkflow(request.workflowId);
	assertNoSubWorkflowCalls(workflow);
	const writer = new TarPackageWriter();
	const { manifest, counts } = await Container.get(N8nPackagesService).exportPackageToWriter(
		{ user, workflowIds: [workflow.id], ...WORKFLOW_PACKAGE_EXPORT_OPTIONS },
		writer,
	);
	const buffer = await collectWithinLimit(writer.finalize(), limit);
	// After the size check, so that a package over the limit logs a failure only.
	Container.get(EventService).emit('n8n-package-exported', exportedEvent(user, manifest, counts));
	return {
		packageBase64: buffer.toString('base64'),
		workflowName: workflow.name,
		sizeBytes: buffer.length,
		requirements: summariseRequirements(manifest.requirements),
		warnings: notCopiedWorkflowWarnings(
			manifest.requirements?.workflows,
			errorWorkflowIdOf(workflow),
		),
	};
}

/**
 * Exports one workflow as a package (.n8np, base64) for another n8n instance. Every surface
 * uses it: the caller finds the workflow with its own access rules. Writes the audit event of
 * the export, or of its failure.
 */
export async function exportWorkflowPackage(
	request: WorkflowPackageExportRequest,
): Promise<ExportedWorkflowPackage> {
	try {
		return await writeWorkflowPackage(request);
	} catch (error) {
		Container.get(EventService).emit('n8n-package-export-failed', {
			user: request.user,
			reason: classifyWorkflowPackageFailure(error),
			workflowIds: [request.workflowId],
		});
		throw error;
	}
}
