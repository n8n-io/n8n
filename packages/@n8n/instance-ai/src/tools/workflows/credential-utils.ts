import type { InstanceAiContext } from '../../types';
import { AI_GATEWAY_CREDENTIAL, AI_GATEWAY_SENTINEL } from './constants';

/**
 * Type guard for the n8n Connect credential shape.
 * Works against `unknown` so it can safely narrow `NodeJSON` credential values,
 * which are typed as `{ id?: string; name: string }` without `__aiGatewayManaged`.
 */
export function isAiGatewayManagedCredential(
	cred: unknown,
): cred is { id: null; name: string; __aiGatewayManaged: true } {
	return (
		typeof cred === 'object' &&
		cred !== null &&
		'__aiGatewayManaged' in cred &&
		(cred as { __aiGatewayManaged: unknown }).__aiGatewayManaged === true
	);
}

/**
 * Serializes a raw node credential entry to the shape used in setup request nodes.
 * Preserves the n8n Connect shape (`id: null, __aiGatewayManaged: true`) as-is;
 * maps real credentials to `{ id, name }`.
 */
export function toSetupNodeCredential(cred: {
	id?: string | null;
	name: string;
}): { id: null; name: string; __aiGatewayManaged: true } | { id: string; name: string } {
	if (isAiGatewayManagedCredential(cred)) {
		return { id: null, name: cred.name, __aiGatewayManaged: true };
	}
	return { id: cred.id!, name: cred.name };
}

/**
 * Assigns a resolved credential to a node's credential slot.
 * `NodeJSON.credentials` predates n8n Connect and is typed as `{ id?: string; name: string }`,
 * which doesn't accommodate `id: null`. The cast is confined here so call-sites stay clean.
 */
export function assignCredentialToNode(
	node: { credentials?: Record<string, { id?: string; name: string }> },
	credType: string,
	credential: { id: string; name: string } | typeof AI_GATEWAY_CREDENTIAL,
): void {
	if (!node.credentials) node.credentials = {};
	(node.credentials as Record<string, unknown>)[credType] = credential;
}

export type ResolveCredentialResult =
	| { resolved: true; credential: { id: string; name: string } | typeof AI_GATEWAY_CREDENTIAL }
	| { resolved: false; error: string };

/**
 * Resolves a single credential slot for an apply operation.
 * Handles the AI Gateway sentinel and real credential lookup uniformly so both
 * `applyNodeCredentials` and `applyNodeChanges` stay thin.
 */
export async function resolveCredentialForApply(
	credType: string,
	credId: string,
	context: Pick<InstanceAiContext, 'credentialService' | 'isAiGatewayCredentialTypeSupported'>,
): Promise<ResolveCredentialResult> {
	if (credId === AI_GATEWAY_SENTINEL) {
		if (context.isAiGatewayCredentialTypeSupported) {
			const supported = await context.isAiGatewayCredentialTypeSupported(credType);
			if (!supported) {
				return {
					resolved: false,
					error: `Credential type "${credType}" is not supported by n8n Connect.`,
				};
			}
		}
		return { resolved: true, credential: AI_GATEWAY_CREDENTIAL };
	}

	try {
		const cred = await context.credentialService.get(credId);
		if (cred) return { resolved: true, credential: { id: cred.id, name: cred.name } };
		return {
			resolved: false,
			error: `Credential ${credId} (type: ${credType}) not found — it may have been deleted`,
		};
	} catch (error) {
		return {
			resolved: false,
			error: `Failed to resolve credential ${credId} (type: ${credType}): ${error instanceof Error ? error.message : 'Unknown error'}`,
		};
	}
}
