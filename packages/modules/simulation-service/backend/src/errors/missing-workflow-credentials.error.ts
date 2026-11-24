import { UserError } from '@n8n/errors';

import type { MissingCredentialIssue } from '../types';

export class MissingWorkflowCredentialsError extends UserError {
	readonly missingCredentials: MissingCredentialIssue[];

	constructor(missingCredentials: MissingCredentialIssue[]) {
		const summary = missingCredentials
			.map(
				(issue) =>
					`${issue.nodeName} (${issue.credentialDisplayName} / ${issue.credentialType}: ${issue.reason === 'missing' ? 'missing' : 'not configured'})`,
			)
			.join('; ');
		super(
			`Workflow requires configured credentials before simulation can run: ${summary}. Configure the required credentials on each node first.`,
		);
		this.name = 'MissingWorkflowCredentialsError';
		this.missingCredentials = missingCredentials;
	}
}
