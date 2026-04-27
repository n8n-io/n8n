import type { AppDefinition } from '../types';

export const SLACK_APP: AppDefinition = {
	kind: 'slack',
	nodeType: 'n8n-nodes-base.slack',
	nodeTypeVersion: 2.4,
	credentialType: 'slackApi',
};
