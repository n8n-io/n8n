/** Credential types for a general authentication method. They belong to no product. */
export const GENERIC_CREDENTIAL_TYPES: ReadonlySet<string> = new Set([
	'httpBasicAuth',
	'httpBearerAuth',
	'httpCustomAuth',
	'httpDigestAuth',
	'httpHeaderAuth',
	'httpMultipleHeadersAuth',
	'httpQueryAuth',
	'httpSslAuth',
	'httpTemplatedCustomAuth',
	'jwtAuth',
	'oAuth1Api',
	'oAuth2Api',
]);

/** Node types that list the credential types of other products, so they relate no node type through them. */
export const RELATION_EXCLUDED_NODE_TYPES: ReadonlySet<string> = new Set([
	'@n8n/n8n-nodes-langchain.agent',
	'n8n-nodes-base.evaluation',
	'n8n-nodes-base.evaluationTrigger',
]);
