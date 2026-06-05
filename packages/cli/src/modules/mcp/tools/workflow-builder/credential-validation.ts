import type { User } from '@n8n/db';
import type { IWorkflowBase } from 'n8n-workflow';

import type { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { NodeTypes } from '@/node-types';

import type { PartialUpdateOperation } from './workflow-operations';

export interface CredentialValidationFailure {
	ok: false;
	opIndex: number;
	error: string;
}

export interface CredentialValidationSuccess {
	ok: true;
}

export type CredentialValidationResult = CredentialValidationSuccess | CredentialValidationFailure;

interface NodeMeta {
	type: string;
	typeVersion: number;
}

const fail = (opIndex: number, message: string): CredentialValidationFailure => ({
	ok: false,
	opIndex,
	error: `Operation ${opIndex} failed: ${message}`,
});

/**
 * Validate every credential reference introduced by the batch against the
 * caller's accessible credentials and against the target node-type's declared
 * credential keys.
 *
 * Only credentials touched by ops in this batch are checked — pre-existing
 * credential references on nodes the agent didn't touch are left alone, so a
 * pre-existing invalid reference can't block an unrelated edit.
 *
 * The check is non-destructive: it only does DB reads and node-type lookups.
 * On the first failure we stop and return the offending op index so the
 * handler can surface it via the standard `Operation N failed: ...` envelope.
 */
export async function validateCredentialReferences(
	operations: PartialUpdateOperation[],
	existingWorkflow: IWorkflowBase,
	user: User,
	credentialsService: CredentialsService,
	nodeTypes: NodeTypes,
): Promise<CredentialValidationResult> {
	const nameToNodeMeta = new Map<string, NodeMeta>();
	for (const node of existingWorkflow.nodes) {
		nameToNodeMeta.set(node.name, { type: node.type, typeVersion: node.typeVersion });
	}

	const credentialCache = new Map<string, { type: string } | 'not-found'>();

	const lookupCredential = async (credentialId: string) => {
		const cached = credentialCache.get(credentialId);
		if (cached) return cached;
		try {
			const credential = await credentialsService.getOne(user, credentialId, false);
			const result = { type: credential.type };
			credentialCache.set(credentialId, result);
			return result;
		} catch (error) {
			if (error instanceof NotFoundError) {
				credentialCache.set(credentialId, 'not-found');
				return 'not-found' as const;
			}
			throw error;
		}
	};

	const checkCredentialReference = async (
		opIndex: number,
		nodeMeta: NodeMeta,
		credentialKey: string,
		credentialId: string,
	): Promise<CredentialValidationFailure | null> => {
		let description;
		try {
			description = nodeTypes.getByNameAndVersion(nodeMeta.type, nodeMeta.typeVersion).description;
		} catch {
			return null;
		}

		const accepted = description.credentials?.find((c) => c.name === credentialKey);
		if (!accepted) {
			return fail(
				opIndex,
				`node type '${nodeMeta.type}' does not accept credential '${credentialKey}'`,
			);
		}

		const credential = await lookupCredential(credentialId);
		if (credential === 'not-found') {
			return fail(opIndex, `credential '${credentialId}' not found or not accessible`);
		}

		if (credential.type !== credentialKey) {
			return fail(
				opIndex,
				`credential '${credentialId}' is type '${credential.type}' but '${credentialKey}' is expected`,
			);
		}

		return null;
	};

	for (let i = 0; i < operations.length; i++) {
		const op = operations[i];

		if (op.type === 'addNode') {
			const nodeMeta: NodeMeta = { type: op.node.type, typeVersion: op.node.typeVersion };
			if (op.node.credentials) {
				for (const [key, value] of Object.entries(op.node.credentials)) {
					if (!value.id) continue;
					const failure = await checkCredentialReference(i, nodeMeta, key, value.id);
					if (failure) return failure;
				}
			}
			nameToNodeMeta.set(op.node.name, nodeMeta);
		} else if (op.type === 'renameNode') {
			const meta = nameToNodeMeta.get(op.oldName);
			if (meta) {
				nameToNodeMeta.delete(op.oldName);
				nameToNodeMeta.set(op.newName, meta);
			}
		} else if (op.type === 'removeNode') {
			nameToNodeMeta.delete(op.nodeName);
		} else if (op.type === 'setNodeCredential') {
			const meta = nameToNodeMeta.get(op.nodeName);
			if (!meta) continue;
			const failure = await checkCredentialReference(i, meta, op.credentialKey, op.credentialId);
			if (failure) return failure;
		}
	}

	return { ok: true };
}
