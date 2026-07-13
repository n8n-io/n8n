import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import type { NodeJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../types';

export interface AiGatewayCredential {
	id: null;
	name: string;
	__aiGatewayManaged: true;
}

/**
 * Human-visible name for the AI Gateway managed credential option. Matches
 * the frontend i18n key `aiGateway.credentialMode.n8nConnect.title` so the
 * setup wizard, credential picker, and chat surface the same label.
 */
export const N8N_CONNECT_DISPLAY_NAME = 'n8n Connect';

/** Canonical AI Gateway-managed credential written to workflow nodes at apply time. */
export const AI_GATEWAY_CREDENTIAL: AiGatewayCredential = {
	id: null,
	name: '',
	__aiGatewayManaged: true,
};

/**
 * A credential ready to write onto a node during setup — a stored credential
 * (`{ id, name }`) or the n8n Connect managed marker. Distinct from the
 * resolver-output `ResolvedCredential` in `resolved-credential.schema`, which
 * additionally carries the credential `type` key.
 */
export type SetupNodeCredential = { id: string; name: string } | AiGatewayCredential;

export function isAiGatewayManagedCredential(
	credential: unknown,
): credential is AiGatewayCredential {
	return (
		typeof credential === 'object' &&
		credential !== null &&
		Reflect.get(credential, 'id') === null &&
		Reflect.get(credential, '__aiGatewayManaged') === true
	);
}

export function toSetupNodeCredential(credential: {
	id?: string | null;
	name: string;
	__aiGatewayManaged?: boolean;
}): SetupNodeCredential | undefined {
	if (isAiGatewayManagedCredential(credential)) {
		return { ...AI_GATEWAY_CREDENTIAL, name: credential.name };
	}
	if (typeof credential.id === 'string') return { id: credential.id, name: credential.name };
	return undefined;
}

export type ResolveCredentialResult =
	| { resolved: true; credential: SetupNodeCredential }
	| { resolved: false; error: string };

export async function resolveCredentialForApply(
	credType: string,
	credId: string,
	context: Pick<InstanceAiContext, 'credentialService'>,
): Promise<ResolveCredentialResult> {
	if (credId === AI_GATEWAY_MANAGED_TAG) {
		if (context.credentialService.isAiGatewayCredentialType) {
			const supported = await context.credentialService.isAiGatewayCredentialType(credType);
			if (!supported) {
				return {
					resolved: false,
					error: `Credential type "${credType}" is not supported by AI Gateway`,
				};
			}
		}
		return { resolved: true, credential: { ...AI_GATEWAY_CREDENTIAL } };
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

export function assignCredentialToNode(
	node: NodeJSON,
	credType: string,
	credential: SetupNodeCredential,
): void {
	node.credentials ??= {};
	(node.credentials as unknown as Record<string, SetupNodeCredential>)[credType] = credential;
}
