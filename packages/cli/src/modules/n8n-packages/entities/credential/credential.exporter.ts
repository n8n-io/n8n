import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';

import { CredentialSerializer } from './credential.serializer';
import type { CredentialReferenceFromWorkflow } from '../workflow/workflow.types';
import type { PackageWriter } from '../../io/package-writer';
import { generateSlug } from '../../io/slug.utils';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';

const CREDENTIAL_SLUG_FALLBACK = 'credential';

export interface CredentialExportRequest {
	user: User;
	references: CredentialReferenceFromWorkflow[];
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
		if (request.references.length === 0) {
			return { entries: [], requirements: [] };
		}

		const workflowsByCredentialId = this.groupWorkflowIdsByCredentialId(request.references);
		const referenceLookup = this.indexReferencesByCredentialId(request.references);
		const entries: ManifestEntry[] = [];
		const requirements: PackageCredentialRequirement[] = [];
		const usedTargets = new Set<string>();

		for (const [credentialId, usedByWorkflows] of workflowsByCredentialId) {
			const credential = await this.credentialsFinder.findCredentialForUser(
				credentialId,
				request.user,
				['credential:read'],
			);

			if (credential) {
				const target = this.allocateUniqueFileName(credential.name, usedTargets);
				const serialized = this.credentialSerializer.serialize(credential);

				request.writer.writeDirectory(target);
				request.writer.writeFile(
					`${target}/credential.json`,
					JSON.stringify(serialized, null, '\t'),
				);

				entries.push({
					id: credential.id,
					name: credential.name,
					target,
				});

				requirements.push({
					id: credential.id,
					name: credential.name,
					type: credential.type,
					usedByWorkflows,
				});
				continue;
			}

			// findCredentialForUser returns null for both orphan (no row) and
			// forbidden (row exists, caller can't read). The second probe
			// disambiguates so we can emit a requirements-only entry for orphans.
			const existsWithoutAccess = await this.credentialsFinder.findCredentialById(credentialId);
			if (existsWithoutAccess) continue;

			const sample = referenceLookup.get(credentialId);
			if (!sample) continue;

			requirements.push({
				id: credentialId,
				name: sample.credentialName,
				type: sample.credentialType,
				usedByWorkflows,
			});
		}

		return { entries, requirements };
	}

	private indexReferencesByCredentialId(
		references: CredentialReferenceFromWorkflow[],
	): Map<string, CredentialReferenceFromWorkflow> {
		const index = new Map<string, CredentialReferenceFromWorkflow>();
		for (const reference of references) {
			if (!index.has(reference.credentialId)) index.set(reference.credentialId, reference);
		}
		return index;
	}

	private groupWorkflowIdsByCredentialId(
		references: CredentialReferenceFromWorkflow[],
	): Map<string, string[]> {
		const grouped = new Map<string, string[]>();
		for (const reference of references) {
			const existing = grouped.get(reference.credentialId);
			if (existing) {
				if (!existing.includes(reference.workflowId)) existing.push(reference.workflowId);
			} else {
				grouped.set(reference.credentialId, [reference.workflowId]);
			}
		}
		return grouped;
	}

	private allocateUniqueFileName(name: string, used: Set<string>): string {
		const base = `credentials/${generateSlug(name, CREDENTIAL_SLUG_FALLBACK)}`;

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
}
