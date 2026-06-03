import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';

import { CredentialSerializer } from './credential.serializer';
import type { WorkflowCredentialRequirement } from './credential.types';
import type { PackageWriter } from '../../io/package-writer';
import { UniqueFilenameAllocator } from '../../io/unique-filename-allocator';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';

interface CredentialGroup {
	// Name+type to use if the DB lookup fails — sourced from the workflow snapshot.
	fallback: WorkflowCredentialRequirement;
	usedByWorkflows: string[];
}

export interface CredentialExportRequest {
	user: User;
	requirements: WorkflowCredentialRequirement[];
	writer: PackageWriter;
}

export interface CredentialExportResult {
	entries: ManifestEntry[];
	requirements: PackageCredentialRequirement[];
}

@Service()
export class CredentialExporter {
	constructor(
		private readonly credentialsFinder: CredentialsFinderService,
		private readonly credentialSerializer: CredentialSerializer,
	) {}

	async export(request: CredentialExportRequest): Promise<CredentialExportResult> {
		const allocator = new UniqueFilenameAllocator('credentials', 'credential');
		const entries: ManifestEntry[] = [];
		const requirements: PackageCredentialRequirement[] = [];

		for (const [credentialId, { fallback, usedByWorkflows }] of this.groupByCredentialId(
			request.requirements,
		)) {
			const credential = await this.credentialsFinder.findCredentialForUser(
				credentialId,
				request.user,
				['credential:read'],
			);

			// Use the workflow data if we can't fetch the full credential
			const { id, name, type } = credential ?? {
				id: credentialId,
				name: fallback.credentialName,
				type: fallback.credentialType,
			};

			if (credential) {
				const target = allocator.allocate(name);
				request.writer.writeDirectory(target);
				request.writer.writeFile(
					`${target}/credential.json`,
					JSON.stringify(this.credentialSerializer.serialize(credential), null, '\t'),
				);
				entries.push({ id, name, target });
			}

			requirements.push({ id, name, type, usedByWorkflows });
		}

		return { entries, requirements };
	}

	private groupByCredentialId(
		requirements: WorkflowCredentialRequirement[],
	): Map<string, CredentialGroup> {
		const grouped = new Map<string, CredentialGroup>();
		for (const requirement of requirements) {
			const existing = grouped.get(requirement.credentialId);
			if (existing) {
				if (!existing.usedByWorkflows.includes(requirement.workflowId)) {
					existing.usedByWorkflows.push(requirement.workflowId);
				}
			} else {
				grouped.set(requirement.credentialId, {
					fallback: requirement,
					usedByWorkflows: [requirement.workflowId],
				});
			}
		}
		return grouped;
	}
}
