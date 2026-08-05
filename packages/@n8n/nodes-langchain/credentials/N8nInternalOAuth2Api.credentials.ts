import type { ICredentialType, INodeProperties } from 'n8n-workflow';

/**
 * Marker credential for authenticating to an n8n MCP Trigger as the running
 * agent's own service-account identity. It stores no secret: at runtime the
 * MCP client node mints a short-lived, audience-locked OAuth2 token server-side
 * from the execution's acting identity (see `mintInternalOAuth2Token`). Usable
 * only inside an autonomous agent run — there is nothing for a user to fill in.
 */
export class N8nInternalOAuth2Api implements ICredentialType {
	name = 'n8nInternalOAuth2Api';

	// eslint-disable-next-line n8n-nodes-base/cred-class-field-display-name-miscased
	displayName = 'n8n Internal OAuth2';

	documentationUrl = 'mcp';

	properties: INodeProperties[] = [
		{
			displayName:
				'This credential lets the node authenticate as the running agent’s own service-account identity. It stores no secret — a short-lived token is minted automatically at runtime, so there is nothing to configure here.',
			name: 'notice',
			type: 'notice',
			default: '',
		},
	];
}
