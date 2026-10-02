import { defineNode } from '@n8n/node-sdk';
import { credential, defineCredential, field } from '@n8n/node-sdk/credentials';

/** The Facebook app. The built-in trigger reads its fields and signs nothing through n8n. */
export const facebookApp = defineCredential({
	id: 'facebook.app',
	legacyName: 'facebookGraphAppApi',
	displayName: 'Facebook Graph API (App)',
	docs: 'facebookapp',
	fields: {
		accessToken: field.secret('Access Token').optional(),
		appSecret: field
			.secret('App Secret')
			.optional()
			.describe(
				'(Optional) When set, the node will sign API calls and verify incoming webhook payloads for added security',
			),
	},
	auth: (a) => a.none(),
});

/** The Facebook app with OAuth2. It extends the legacy type that holds the Graph API scopes. */
export const facebookAppOAuth2 = defineCredential({
	id: 'facebookApp.oauth2',
	legacyName: 'facebookGraphAppOAuth2Api',
	displayName: 'Facebook Graph (App) OAuth2 API',
	docs: 'facebookapp',
	legacyParent: 'facebookGraphApiOAuth2Api',
	fields: {
		appSecret: field
			.secret('App Secret')
			.optional()
			.describe(
				'(Optional) When set, the node will verify incoming webhook payloads for added security',
			),
	},
	auth: (a) =>
		a.oauth2.authorizationCode({
			authorizationEndpoint: 'https://www.facebook.com/v25.0/dialog/oauth',
			tokenEndpoint: 'https://graph.facebook.com/v25.0/oauth/access_token',
			scope: [
				'public_profile',
				'email',
				'pages_show_list',
				'pages_read_engagement',
				'pages_read_user_content',
				'pages_manage_metadata',
				'pages_manage_posts',
				'business_management',
			],
			pkce: false,
			editableScopes: true,
		}),
});

/**
 * The built-in Facebook Trigger node. It answers the Meta verification request and registers
 * the app subscription, so n8n runs the built-in node.
 */
export const facebookTrigger = defineNode({
	id: 'facebookTrigger',
	displayName: 'Facebook Trigger',
	credential: credential({
		types: [facebookApp, facebookAppOAuth2],
	}),
});
