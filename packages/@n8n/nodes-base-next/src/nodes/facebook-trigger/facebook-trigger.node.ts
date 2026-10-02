import { compat, credential, credentialType, defineNode, t } from '@n8n/node-sdk';

/** The Facebook app. The built-in trigger reads its fields and signs nothing through n8n. */
export const facebookApp = credentialType({
	id: 'facebook.app',
	legacyName: 'facebookGraphAppApi',
	displayName: 'Facebook Graph API (App)',
	docs: 'facebookapp',
	fields: {
		accessToken: t.secret('Access Token').optional(),
		appSecret: t
			.secret('App Secret')
			.optional()
			.describe(
				'(Optional) When set, the node will sign API calls and verify incoming webhook payloads for added security',
			),
	},
	auth: (a) => a.none(),
});

/**
 * The built-in Facebook Trigger node. It answers the Meta verification request and registers
 * the app subscription, so n8n runs the built-in node.
 */
export const facebookTrigger = defineNode({
	id: 'facebookTrigger',
	displayName: 'Facebook Trigger',
	credential: credential({
		types: [facebookApp, compat('facebookGraphAppOAuth2Api')],
	}),
});
