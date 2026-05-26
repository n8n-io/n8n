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

		const entries: ManifestEntry[] = [];
		const requirements: PackageCredentialRequirement[] = [];

		for (const reference of request.references) {
			const credential = await this.credentialsFinder.findCredentialForUser(
				reference.credentialId,
				request.user,
				['credential:read'],
			);
			if (!credential) continue;

			const target = `credentials/${generateSlug(credential.name, CREDENTIAL_SLUG_FALLBACK)}`;
			const serialized = this.credentialSerializer.serialize(credential);

			request.writer.writeDirectory(target);
			request.writer.writeFile(`${target}/credential.json`, JSON.stringify(serialized, null, '\t'));

			entries.push({
				id: credential.id,
				name: credential.name,
				target,
			});

			requirements.push({
				id: credential.id,
				name: credential.name,
				type: credential.type,
				usedByWorkflows: [reference.workflowId],
			});
		}

		return { entries, requirements };
	}
}
