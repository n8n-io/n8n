import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class GristApi implements ICredentialType {
	name = 'gristApi';

	displayName = 'Grist API';

	documentationUrl = 'grist';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'In Grist, open the account menu (top right) > Account settings > Developer to create or copy your API key',
		},
		{
			displayName: 'Grist URL',
			name: 'url',
			type: 'string',
			// Must default to empty: n8n injects field defaults into any saved credential
			// missing the field, so a non-empty default would shadow the legacy fields
			// below. Empty means hosted Grist. Optional on purpose: if required, editing a
			// legacy credential (e.g. to rotate the API key) would force a URL into it,
			// overriding the stored host it still relies on.
			default: '',
			placeholder: 'https://api.getgrist.com',
			description:
				'Leave empty for hosted Grist (https://api.getgrist.com). Use https://YOUR_TEAM.getgrist.com for a single team, or your own URL if self-managed. Do not include /api.',
		},
		// Fields from before the single Grist URL field. They must stay declared: execution
		// strips any stored value whose field is not declared, so removing these would cut
		// old credentials off from the base URL they store. Hidden keeps them out of the UI.
		{
			displayName: 'Custom Subdomain',
			name: 'customSubdomain',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Self-Hosted URL',
			name: 'selfHostedUrl',
			type: 'hidden',
			default: '',
		},
	];
}
