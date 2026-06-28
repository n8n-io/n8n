import { randomCredentialPayload, type CredentialPayload } from '@n8n/backend-test-utils';

import { TarPackageWriter } from '../../io/tar/tar-package-writer';
import { FORMAT_VERSION } from '../../spec/constants';
import type { PackageManifest } from '../../spec/manifest.schema';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';
import type { SerializedWorkflow } from '../../spec/serialized/workflow.schema';

import { streamToBuffer } from '../utils/tar-support';

/** Credential type used in package import integration tests (matches `randomCredentialPayload` default). */
export const PACKAGE_GITHUB_CREDENTIAL_TYPE = 'githubApi';

export function githubCredentialPayload(
	overrides: Partial<CredentialPayload> = {},
): CredentialPayload {
	return {
		...randomCredentialPayload({ type: PACKAGE_GITHUB_CREDENTIAL_TYPE }),
		...overrides,
	};
}

export function serializedWorkflow(
	overrides: Partial<SerializedWorkflow> = {},
): SerializedWorkflow {
	return {
		id: 'wf-id',
		name: 'Workflow',
		nodes: [
			{
				id: 'manual-trigger',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		],
		connections: {},
		versionId: 'wire-version-id',
		parentFolderId: null,
		isPublished: false,
		isArchived: false,
		...overrides,
	};
}

export function serializedWorkflowWithCredential(options: {
	id: string;
	name: string;
	credentialId: string;
	credentialName: string;
	credentialType?: string;
}): SerializedWorkflow {
	const credentialType = options.credentialType ?? PACKAGE_GITHUB_CREDENTIAL_TYPE;

	return serializedWorkflow({
		id: options.id,
		name: options.name,
		nodes: [
			{
				id: 'http-node',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				credentials: {
					[credentialType]: { id: options.credentialId, name: options.credentialName },
				},
			},
		],
	});
}

/** Builds manifest credential requirements from workflow node refs (simulates export). */
export function credentialRequirementsFromWorkflows(
	workflows: SerializedWorkflow[],
): PackageCredentialRequirement[] {
	const byId = new Map<string, PackageCredentialRequirement>();

	for (const workflow of workflows) {
		for (const node of workflow.nodes) {
			if (!node.credentials) continue;

			for (const [credentialType, details] of Object.entries(node.credentials)) {
				if (details.id === null) continue;

				const existing = byId.get(details.id);
				if (existing) {
					if (!existing.usedByWorkflows.includes(workflow.id)) {
						existing.usedByWorkflows.push(workflow.id);
					}
					continue;
				}

				byId.set(details.id, {
					id: details.id,
					name: details.name,
					type: credentialType,
					usedByWorkflows: [workflow.id],
				});
			}
		}
	}

	return [...byId.values()];
}

export async function buildImportPackageBuffer(
	workflows: SerializedWorkflow[],
	options: {
		manifestExtras?: Partial<PackageManifest>;
		sourceId?: string;
	} = {},
): Promise<Buffer> {
	const writer = new TarPackageWriter();
	const sourceId = options.sourceId ?? 'integration-test-source';

	const manifest: PackageManifest = {
		packageFormatVersion: FORMAT_VERSION,
		exportedAt: new Date().toISOString(),
		sourceN8nVersion: '1.0.0',
		sourceId,
		workflows: workflows.map((w, idx) => ({
			id: w.id,
			name: w.name,
			target: `workflows/wf-${idx}`,
		})),
		...options.manifestExtras,
	};

	const explicitCredentials = options.manifestExtras?.requirements?.credentials;
	if (explicitCredentials === undefined) {
		const derived = credentialRequirementsFromWorkflows(workflows);
		if (derived.length > 0) {
			manifest.requirements = {
				...manifest.requirements,
				credentials: derived,
			};
		}
	}

	writer.writeFile('manifest.json', JSON.stringify(manifest));
	workflows.forEach((wf, idx) => {
		writer.writeDirectory(`workflows/wf-${idx}`);
		writer.writeFile(`workflows/wf-${idx}/workflow.json`, JSON.stringify(wf));
	});

	return await streamToBuffer(writer.finalize());
}
