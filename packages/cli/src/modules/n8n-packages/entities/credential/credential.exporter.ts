import type { CredentialsEntity, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { Credentials } from 'n8n-core';

import { CredentialsFinderService } from '@n8n/backend-services';

import { addRequirementUsage, type RequirementUsage } from '../requirement-source';

import { selectCredentialDataForExport } from './credential-export-policy';
import { CredentialSerializer } from './credential.serializer';
import type { CredentialExportRequirement } from './credential.types';
import { projectScopedDirectory, writeManifestEntry } from '../../io/manifest-entry';
import type { PackageWriter } from '../../io/package-writer';
import type { CredentialExportPolicy } from '../../n8n-packages.types';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';

interface CredentialGroup extends RequirementUsage {
	// Name+type to use if the DB lookup fails — sourced from the workflow snapshot.
	fallback: CredentialExportRequirement;
}

export interface CredentialExportRequest {
	user: User;
	requirements: CredentialExportRequirement[];
	writer: PackageWriter;
	credentialExportPolicy: CredentialExportPolicy;
	/** Target directory of each exported project (`projects/<slug>-<id>`), keyed by project id. */
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
		const entries: ManifestEntry[] = [];
		const requirements: PackageCredentialRequirement[] = [];

		for (const [credentialId, { fallback, ...usage }] of this.groupByCredentialId(
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
				const data = await selectCredentialDataForExport(
					request.credentialExportPolicy,
					async () =>
						await new Credentials(
							{ id: credential.id, name: credential.name },
							credential.type,
							credential.data,
						).getData(),
				);
				entries.push(
					await writeManifestEntry(
						request.writer,
						'credentials',
						projectScopedDirectory(
							'credentials',
							this.ownerProjectId(credential),
							request.projectTargetsById,
						),
						{ id: credential.id, name: credential.name },
						this.credentialSerializer.serialize(credential, { data }),
					),
				);
			}

			requirements.push({ id, ...(name ? { name } : {}), ...(type ? { type } : {}), ...usage });
		}

		return { entries, requirements };
	}

	/**
	 * A credential has no owner column: its owner is the project on the
	 * `credential:owner` sharing. Undefined for a global credential.
	 */
	private ownerProjectId(credential: CredentialsEntity): string | undefined {
		return credential.shared?.find((sharing) => sharing.role === 'credential:owner')?.projectId;
	}

	private groupByCredentialId(
		requirements: CredentialExportRequirement[],
	): Map<string, CredentialGroup> {
		const grouped = new Map<string, CredentialGroup>();
		for (const requirement of requirements) {
			const group = grouped.get(requirement.credentialId) ?? {
				fallback: requirement,
				usedByWorkflows: [],
			};
			if ('workflowId' in requirement && !('workflowId' in group.fallback)) {
				group.fallback = requirement;
			}
			addRequirementUsage(group, requirement);
			grouped.set(requirement.credentialId, group);
		}
		return grouped;
	}
}
