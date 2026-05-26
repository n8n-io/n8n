import type { CredentialsEntity, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';

import { CredentialSerializer } from './credential.serializer';
import type { PackageWriter } from '../../io/package-writer';
import { generateSlug } from '../../io/slug.utils';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';
import type { CredentialReferenceFromWorkflow } from '../workflow/workflow.types';

const CREDENTIAL_SLUG_FALLBACK = 'credential';
const MAX_DISPLAYED_FORBIDDEN_IDS = 20;

type Classification =
	| { kind: 'accessible'; credential: CredentialsEntity; usedByWorkflows: string[] }
	| {
			kind: 'orphan';
			credentialId: string;
			sample: CredentialReferenceFromWorkflow;
			usedByWorkflows: string[];
	  }
	| { kind: 'forbidden'; credentialId: string };

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

		const classifications = await this.classifyReferences(request);
		this.assertNoForbiddenCredentials(classifications);

		return this.writeClassifications(classifications, request.writer);
	}

	private async classifyReferences(request: CredentialExportRequest): Promise<Classification[]> {
		const workflowsByCredentialId = this.groupWorkflowIdsByCredentialId(request.references);
		const referenceLookup = this.indexReferencesByCredentialId(request.references);
		const classifications: Classification[] = [];

		for (const [credentialId, usedByWorkflows] of workflowsByCredentialId) {
			const credential = await this.credentialsFinder.findCredentialForUser(
				credentialId,
				request.user,
				['credential:read'],
			);

			if (credential) {
				classifications.push({ kind: 'accessible', credential, usedByWorkflows });
				continue;
			}

			// findCredentialForUser returns null for both orphan (no row) and
			// forbidden (row exists, caller can't read). The second probe
			// disambiguates so we can emit a requirements-only entry for orphans
			// while still failing loudly on forbidden access.
			const existsWithoutAccess = await this.credentialsFinder.findCredentialById(credentialId);
			if (existsWithoutAccess) {
				classifications.push({ kind: 'forbidden', credentialId });
				continue;
			}

			const sample = referenceLookup.get(credentialId);
			if (!sample) continue;

			classifications.push({ kind: 'orphan', credentialId, sample, usedByWorkflows });
		}

		return classifications;
	}

	private assertNoForbiddenCredentials(classifications: Classification[]) {
		const forbiddenIds = classifications
			.filter((c): c is Extract<Classification, { kind: 'forbidden' }> => c.kind === 'forbidden')
			.map((c) => c.credentialId);

		if (forbiddenIds.length === 0) return;

		const displayed = forbiddenIds.slice(0, MAX_DISPLAYED_FORBIDDEN_IDS);
		const omittedCount = forbiddenIds.length - displayed.length;

		throw new UserError(`${forbiddenIds.length} credential(s) not accessible. Export aborted.`, {
			description: `Inaccessible credential IDs: ${displayed.join(', ')}${
				omittedCount > 0 ? `, and ${omittedCount} more` : ''
			}`,
		});
	}

	private writeClassifications(
		classifications: Classification[],
		writer: PackageWriter,
	): CredentialExportResult {
		const entries: ManifestEntry[] = [];
		const requirements: PackageCredentialRequirement[] = [];
		const usedTargets = new Set<string>();

		for (const classification of classifications) {
			if (classification.kind === 'accessible') {
				const { credential, usedByWorkflows } = classification;
				const target = this.allocateUniqueFileName(credential.name, usedTargets);
				const serialized = this.credentialSerializer.serialize(credential);

				writer.writeDirectory(target);
				writer.writeFile(`${target}/credential.json`, JSON.stringify(serialized, null, '\t'));

				entries.push({ id: credential.id, name: credential.name, target });
				requirements.push({
					id: credential.id,
					name: credential.name,
					type: credential.type,
					usedByWorkflows,
				});
			} else if (classification.kind === 'orphan') {
				requirements.push({
					id: classification.credentialId,
					name: classification.sample.credentialName,
					type: classification.sample.credentialType,
					usedByWorkflows: classification.usedByWorkflows,
				});
			}
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
