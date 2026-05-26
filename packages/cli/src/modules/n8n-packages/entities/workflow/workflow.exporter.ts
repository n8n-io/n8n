import type { User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowSerializer } from './workflow.serializer';
import type { CredentialReferenceFromWorkflow } from './workflow.types';
import type { PackageWriter } from '../../io/package-writer';
import { generateSlug } from '../../io/slug.utils';
import type { ManifestEntry } from '../../spec/manifest.schema';

export interface WorkflowExportRequest {
	user: User;
	workflowIds: string[];
	writer: PackageWriter;
}

export interface WorkflowExportResult {
	entries: ManifestEntry[];
	credentialReferences: CredentialReferenceFromWorkflow[];
}

@Service()
export class WorkflowExporter {
	constructor(
		private readonly workflowFinder: WorkflowFinderService,
		private readonly workflowSerializer: WorkflowSerializer,
	) {}

	async export(request: WorkflowExportRequest): Promise<WorkflowExportResult> {
		const workflows = await this.workflowFinder.findWorkflowsByIdsForUser(
			request.workflowIds,
			request.user,
			['workflow:export'],
			{ includeParentFolder: true },
		);

		this.assertAllRequestedWorkflowsFound(request.workflowIds, workflows);

		const entries: ManifestEntry[] = [];
		const credentialReferences: CredentialReferenceFromWorkflow[] = [];
		const usedTargets = new Set<string>();

		for (const workflow of workflows) {
			const target = this.allocateUniqueFileName(workflow.name, usedTargets);
			const serialized = this.workflowSerializer.serialize(workflow);

			request.writer.writeDirectory(target);
			request.writer.writeFile(`${target}/workflow.json`, JSON.stringify(serialized, null, '\t'));

			entries.push({
				id: workflow.id,
				name: workflow.name,
				target,
			});

			credentialReferences.push(...this.collectCredentialReferences(workflow));
		}

		return { entries, credentialReferences };
	}

	private collectCredentialReferences(workflow: WorkflowEntity): CredentialReferenceFromWorkflow[] {
		const seen = new Set<string>();
		const references: CredentialReferenceFromWorkflow[] = [];

		for (const node of workflow.nodes ?? []) {
			if (!node.credentials) continue;

			for (const [credentialType, details] of Object.entries(node.credentials)) {
				// `id` is nullable when the user has dropped a credential slot onto a
				// node without selecting one yet — nothing to export in that case.
				if (!details?.id) continue;
				if (seen.has(details.id)) continue;
				seen.add(details.id);

				references.push({
					workflowId: workflow.id,
					credentialId: details.id,
					credentialName: details.name,
					credentialType,
				});
			}
		}

		return references;
	}

	private allocateUniqueFileName(name: string, used: Set<string>): string {
		const base = `workflows/${generateSlug(name)}`;

		if (!used.has(base)) {
			used.add(base);
			return base;
		}

		for (let suffix = 2; ; suffix++) {
			const candidate = `${base}-${suffix}`;
			if (!used.has(candidate)) {
				used.add(candidate);
				return candidate;
			}
		}
	}

	private assertAllRequestedWorkflowsFound(
		requestedWorkflowIds: string[],
		foundWorkflows: Array<{ id: string }>,
	) {
		const foundWorkflowIds = new Set(foundWorkflows.map(({ id }) => id));
		const missingWorkflowIds = requestedWorkflowIds.filter((id) => !foundWorkflowIds.has(id));

		if (missingWorkflowIds.length > 0) {
			const displayedWorkflowIds = missingWorkflowIds.slice(0, 20);
			const omittedCount = missingWorkflowIds.length - displayedWorkflowIds.length;

			throw new UserError(
				`${missingWorkflowIds.length} workflow(s) not found or not accessible. Export aborted.`,
				{
					description: `Missing workflow IDs: ${displayedWorkflowIds.join(', ')}${
						omittedCount > 0 ? `, and ${omittedCount} more` : ''
					}`,
				},
			);
		}
	}
}
