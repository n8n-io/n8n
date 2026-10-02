import { compat, credential, defineNode } from '@n8n/node-sdk';

/**
 * The built-in Facebook Trigger node. It answers the Meta verification request and registers
 * the app subscription, so n8n runs the built-in node.
 */
export const facebookTrigger = defineNode({
	id: 'facebookTrigger',
	displayName: 'Facebook Trigger',
	credential: credential({
		types: [compat('facebookGraphAppApi'), compat('facebookGraphAppOAuth2Api')],
	}),
});
