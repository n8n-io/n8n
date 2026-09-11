import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SlackSigningSecretApi implements ICredentialType {
	name = 'slackSigningSecretApi';

	displayName = 'Slack Signing Secret';

	icon = 'file:../nodes/Slack/slack.svg' as const;

	documentationUrl = 'slack';

	// The secret only verifies incoming requests. It never leaves the instance in a request.
	hideDomainRestrictionFields = true;

	// Only the nodes that declare this credential (the Slack Trigger) can decrypt it.
	restrictToSupportedNodes = true as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Signing Secret',
			name: 'signatureSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'The signing secret of your Slack app. Find it under "Basic Information" in the Slack API dashboard. The Slack Trigger node uses it to verify that incoming requests come from Slack. <a href="https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.slacktrigger/#verify-the-webhook" target="_blank">More info</a>.',
		},
	];
}
