import {
	AI_GATEWAY_MANAGED_TAG,
	type AgentJsonMcpServerConfig,
	type McpRegistryServerResponse,
} from '@n8n/api-types';
import { isMcpAiGatewayAuthentication } from 'n8n-workflow';

import type { ToolCredentialRef } from '@/features/shared/toolsConnection/types';

type McpEntryAuth = Pick<AgentJsonMcpServerConfig, 'authentication' | 'credential'>;

/** On a registry entry, 'none' means Gateway credits: every registry node requires a credential. */
export function isAiGatewayMcpEntry(
	server: Pick<AgentJsonMcpServerConfig, 'authentication' | 'metadata'>,
): boolean {
	return Boolean(server.metadata?.nodeTypeName) && server.authentication === 'none';
}

/** The entry fields for a picked credential. Gateway credits have no stored credential. */
export function toMcpEntryAuth(authType: string, credentialId: string): McpEntryAuth {
	return credentialId === AI_GATEWAY_MANAGED_TAG
		? { authentication: 'none', credential: undefined }
		: { authentication: authType, credential: credentialId };
}

/**
 * The credential references of a catalog row, Gateway credits first. Marks the
 * option that `selected` uses.
 */
export function toMcpRegistryCredentialRefs(
	server: McpRegistryServerResponse,
	selected?: McpEntryAuth & Pick<AgentJsonMcpServerConfig, 'metadata'>,
): ToolCredentialRef[] {
	const refs = server.credentials.map(({ credentialType, name }): ToolCredentialRef => {
		const ref = { authType: credentialType, displayName: name, required: true };
		if (!isMcpAiGatewayAuthentication(credentialType)) {
			const credentialId =
				selected?.authentication === credentialType ? selected.credential : undefined;
			return { ...ref, credentialId };
		}
		const isSelected = selected !== undefined && isAiGatewayMcpEntry(selected);
		return {
			...ref,
			credentialId: isSelected ? AI_GATEWAY_MANAGED_TAG : undefined,
			aiGateway: true,
		};
	});
	return [...refs.filter((ref) => ref.aiGateway), ...refs.filter((ref) => !ref.aiGateway)];
}
