import type { SerializedCredentialData } from '@n8n/api-types';
import type { CredentialsEntity, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { Credentials } from 'n8n-core';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import isEqual from 'lodash/isEqual';

import { CredentialsFinderService } from '@n8n/backend-services';

import { CredentialTypes } from '@/credential-types';

import {
	findDisplayControllers,
	isConfirmedControllerValue,
	resolveCredentialProperties,
} from './credential-display-controllers';
import { selectCredentialDataForExport } from './credential-export-policy';
import { CredentialSerializer } from './credential.serializer';
import type { CredentialRequirement } from './credential.types';
import { projectScopedDirectory, writeManifestEntry } from '../../io/manifest-entry';
import type { PackageWriter } from '../../io/package-writer';
import type { CredentialExportPolicy } from '../../n8n-packages.types';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';
import { addRequirementUsage, type RequirementUsage } from '../requirement-source';

interface CredentialGroup extends RequirementUsage {
	// Keep authored metadata when the credential is not accessible.
	fallback: CredentialRequirement;
}

export interface CredentialExportRequest {
	user: User;
	requirements: CredentialRequirement[];
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
		private readonly credentialTypes: CredentialTypes,
	) {}

	async export(request: CredentialExportRequest): Promise<CredentialExportResult> {
		const entries: ManifestEntry[] = [];
		const requirements: PackageCredentialRequirement[] = [];

		for (const [credentialId, { fallback, usedBy }] of this.groupByCredentialId(
			request.requirements,
		)) {
			const credential = await this.credentialsFinder.findCredentialForUser(
				credentialId,
				request.user,
				['credential:read'],
			);

			// Use authored metadata if the credential is not accessible.
			const { id, name, type } = credential ?? {
				id: credentialId,
				name: fallback.credentialName,
				type: fallback.credentialType,
			};

			if (credential) {
				let decryptedData: ICredentialDataDecryptedObject | undefined;
				const expressionData = await selectCredentialDataForExport(
					request.credentialExportPolicy,
					async () => {
						decryptedData = await new Credentials(
							{ id: credential.id, name: credential.name },
							credential.type,
							credential.data,
						).getData();
						return decryptedData;
					},
				);
				const data = this.withDisplayControllers(credential.type, expressionData, decryptedData);
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
						this.credentialSerializer.serialize(credential, {
							data,
							...(data !== undefined ? { dataIsComplete: isEqual(data, decryptedData) } : {}),
						}),
					),
				);
			}

			requirements.push({
				id,
				name,
				type,
				usedBy,
			});
		}

		return { entries, requirements };
	}

	/**
	 * An imported expression in a hidden field is lost when the destination shows another field set.
	 * Add the plain values that decide which fields show, so the destination shows the same ones.
	 * A secret never qualifies, and an unknown credential type adds nothing.
	 */
	private withDisplayControllers(
		type: string,
		expressionData: SerializedCredentialData | undefined,
		decryptedData: ICredentialDataDecryptedObject | undefined,
	): SerializedCredentialData | undefined {
		if (expressionData === undefined || decryptedData === undefined) return expressionData;

		const properties = resolveCredentialProperties(this.credentialTypes, type);
		if (properties === undefined) return expressionData;

		const exported: SerializedCredentialData = { ...expressionData };
		for (const name of findDisplayControllers(properties, Object.keys(expressionData))) {
			const value = decryptedData[name];
			if (name in exported || !isConfirmedControllerValue(properties, name, value)) continue;
			exported[name] = value;
		}
		return exported;
	}

	/** A credential has no owner column: its owner is the project on the `credential:owner` sharing. */
	private ownerProjectId(credential: CredentialsEntity): string | undefined {
		return credential.shared?.find((sharing) => sharing.role === 'credential:owner')?.projectId;
	}

	private groupByCredentialId(requirements: CredentialRequirement[]): Map<string, CredentialGroup> {
		const grouped = new Map<string, CredentialGroup>();
		for (const requirement of requirements) {
			const group = grouped.get(requirement.credentialId) ?? {
				fallback: { ...requirement },
				usedBy: [],
			};
			// Workflow consumers require both fields, even when an Agent was seen first.
			if ('workflowId' in requirement && !('workflowId' in group.fallback)) {
				group.fallback = { ...requirement };
			}
			group.fallback.credentialName ??= requirement.credentialName;
			group.fallback.credentialType ??= requirement.credentialType;
			addRequirementUsage(group, requirement);
			grouped.set(requirement.credentialId, group);
		}
		return grouped;
	}
}
