// STABLE SEAM. Only this file is allowed to import the public-API workflow /
// credential service-layer modules and WorkflowService. Inputs/outputs are
// typed against @n8n/api-types / parsed shapes. If the public-API DTOs
// change, this file is the one that updates; nothing else in the headless
// code path should need to change.

import type { User } from '@n8n/db';
import { WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import type {
	ICredentialDataDecryptedObject,
	INode,
	INodeCredentials,
	INodeCredentialsDetails,
} from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import type { ParsedCredential, ParsedWorkflow } from './parse';

import { saveCredential as publicApiSaveCredential } from '@/public-api/v1/handlers/credentials/credentials.service';
import { createWorkflow as publicApiCreateWorkflow } from '@/public-api/v1/handlers/workflows/workflows.service';
import { WorkflowService } from '@/workflows/workflow.service';

export interface CreatedWorkflow {
	id: string;
	name: string;
	parsed: ParsedWorkflow;
}

export interface CreatedCredential {
	id: string;
	name: string;
	type: string;
}

function isCredentialDataObject(value: unknown): value is ICredentialDataDecryptedObject {
	// Shallow check: the public-API service (createUnmanagedCredential →
	// checkCredentialData) validates required fields per credential type
	// before persisting, so a wider object check here is enough. Deeper
	// validation at this layer would duplicate that work.
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toDecryptedData(parsed: ParsedCredential): ICredentialDataDecryptedObject {
	if (!isCredentialDataObject(parsed.data)) {
		throw new UserError(
			`Credential "${parsed.name}" has invalid "data" field — expected an object.`,
		);
	}
	return parsed.data;
}

function resolveNodeCredentials(
	credentials: INodeCredentials,
	created: CreatedCredential[],
): INodeCredentials {
	const resolved: INodeCredentials = {};
	for (const [credentialType, details] of Object.entries(credentials)) {
		resolved[credentialType] = resolveSingleCredential(credentialType, details, created);
	}
	return resolved;
}

function resolveSingleCredential(
	credentialType: string,
	details: INodeCredentialsDetails,
	created: CreatedCredential[],
): INodeCredentialsDetails {
	const sameType = created.filter((c) => c.type === credentialType);
	if (sameType.length === 0) return details;

	const idMatch = details.id !== null ? sameType.find((c) => c.id === details.id) : undefined;
	if (idMatch) {
		return { ...details, id: idMatch.id, name: idMatch.name };
	}

	const nameMatch = sameType.find((c) => c.name === details.name);
	if (nameMatch) {
		return { ...details, id: nameMatch.id, name: nameMatch.name };
	}

	return details;
}

function applyCredentialResolution(nodes: INode[], created: CreatedCredential[]): INode[] {
	if (created.length === 0) return nodes;
	return nodes.map((node) => {
		if (!node.credentials) return node;
		return { ...node, credentials: resolveNodeCredentials(node.credentials, created) };
	});
}

function parsedToEntity(parsed: ParsedWorkflow, created: CreatedCredential[]): WorkflowEntity {
	return Object.assign(new WorkflowEntity(), {
		name: parsed.name,
		nodes: applyCredentialResolution(parsed.nodes, created),
		connections: parsed.connections,
		settings: parsed.settings ?? {},
		active: false,
	});
}

export const crudAdapter = {
	async createWorkflows(
		owner: User,
		parsed: ParsedWorkflow[],
		credentials: CreatedCredential[] = [],
	): Promise<CreatedWorkflow[]> {
		const created: CreatedWorkflow[] = [];
		for (const wf of parsed) {
			const entity = parsedToEntity(wf, credentials);
			const result = await publicApiCreateWorkflow(owner, entity);
			created.push({ id: result.id, name: result.name, parsed: wf });
		}
		return created;
	},

	async createCredentials(owner: User, parsed: ParsedCredential[]): Promise<CreatedCredential[]> {
		const created: CreatedCredential[] = [];
		for (const cred of parsed) {
			const data = toDecryptedData(cred);
			const result = await publicApiSaveCredential(
				{ name: cred.name, type: cred.type, data },
				owner,
			);
			created.push({ id: result.id, name: result.name, type: result.type });
		}
		return created;
	},

	async activateWorkflow(owner: User, workflowId: string): Promise<void> {
		await Container.get(WorkflowService).activateWorkflow(owner, workflowId, { source: 'api' });
	},
};
