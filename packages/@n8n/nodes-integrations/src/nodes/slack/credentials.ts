import { defineCredential, field } from '@n8n/node-sdk/credentials';

export const slackToken = defineCredential({
	id: 'slack.token',
	version: '1.0.0',
	legacyName: 'slackApi',
	displayName: 'Slack API',
	docs: 'slack',
	fields: {
		accessToken: field
			.secret('Access Token')
			.describe(
				'In your Slack app, open OAuth & Permissions. Copy the Bot User OAuth Token (xoxb-) or User OAuth Token (xoxp-), depending on the operations you need.',
			),
		signatureSecret: field
			.secret('Signature Secret')
			.optional()
			.describe(
				'The signature secret is used to verify the authenticity of requests sent by Slack.',
			),
		// n8n sets these when it builds a managed Slack app, e.g. for an Agent.
		managedAppId: field.hidden('Managed App ID'),
		teamId: field.hidden('Slack Team ID'),
		managerCredentialId: field.hidden('Manager Credential ID'),
		agentId: field.hidden('Agent ID'),
	},
	baseUrl: 'https://slack.com/api',
	// `files.slack.com` takes the bytes of a file upload.
	hosts: ['slack.com', 'files.slack.com'],
	auth: (a) => a.bearer('accessToken'),
	// Slack answers 200 with `ok: false` to a bad token.
	test: {
		get: '/users.profile.get',
		failWhen: [{ body: { error: 'invalid_auth' }, message: 'Invalid access token' }],
	},
	notice: {
		text: 'We strongly recommend setting up a <a href="https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.slacktrigger/#verify-the-webhook" target="_blank">signing secret</a> to ensure the authenticity of requests.',
		when: { signatureSecret: '' },
	},
});
