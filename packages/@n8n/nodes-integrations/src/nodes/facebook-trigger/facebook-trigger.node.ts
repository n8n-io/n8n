import { defineNode } from '@n8n/node-sdk';
import { credential } from '@n8n/node-sdk/credentials';

import { facebookApp, facebookAppOAuth2 } from './credentials';

/**
 * The legacy Facebook Trigger node. It answers the Meta verification request and registers
 * the app subscription, so n8n runs the legacy node.
 */
export const facebookTrigger = defineNode({
	id: 'facebookTrigger',
	displayName: 'Facebook Trigger',
	credential: credential({
		types: [facebookApp, facebookAppOAuth2],
	}),
});
