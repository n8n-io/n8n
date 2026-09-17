import type { ICredentialType, INodeProperties } from 'n8n-workflow';

/**
 * Base credential for MCP servers the AI Gateway hosts and bills to Gateway credits.
 *
 * Nothing here is ever filled in by a user or written to the database. The
 * registry synthesizes a per-server type extending this one, and the credential
 * entry under `node.credentials` carries the `__aiGatewayManaged` marker, so the
 * token is minted for the running user at execution time.
 */
export class McpGatewayApi implements ICredentialType {
	name = 'mcpGatewayApi';

	displayName = 'MCP Gateway Credits';

	documentationUrl = 'mcp';

	properties: INodeProperties[] = [
		{
			displayName: 'Token',
			name: 'token',
			type: 'hidden',
			typeOptions: { password: true },
			default: '',
		},
	];
}
