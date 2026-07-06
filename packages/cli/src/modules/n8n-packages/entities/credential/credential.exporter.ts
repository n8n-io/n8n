import type { CredentialsEntity, User } from '@n8n/db';
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
	// Contains a map of projectId to export location
	// p123 -> /project/p123/
	projectTargetsById?: Map<string, string>;
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
		// One allocator per base directory: `credentials/` and each
		// `projects/<slug>/credentials/` suffix collisions independently.
		const allocators = new Map<string, UniqueFilenameAllocator>();
		const allocatorFor = (baseDir: string) => {
			const existing = allocators.get(baseDir);
			if (existing) return existing;
			const created = new UniqueFilenameAllocator(baseDir, 'credential');
			allocators.set(baseDir, created);
			return created;
		};
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
				const baseDir = this.resolveBaseDir(credential, request.projectTargetsById);
				const target = allocatorFor(baseDir).allocate(name);
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

	/**
	 * Namespaces a credential under its OWNER project when that project is part of
	 * the export; otherwise (owned by a non-exported project, or global) it stays at
	 * the top-level `credentials/`. Owner = the `credential:owner` sharing's project.
	 */
	private resolveBaseDir(
		credential: CredentialsEntity,
		projectTargetsById?: Map<string, string>,
	): string {
		if (!projectTargetsById || projectTargetsById.size === 0) return 'credentials';
		const ownerProjectId = credential.shared?.find(
			(sharing) => sharing.role === 'credential:owner',
		)?.projectId;
		const prefix = ownerProjectId ? projectTargetsById.get(ownerProjectId) : undefined;
		return prefix ? `${prefix}/credentials` : 'credentials';
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
