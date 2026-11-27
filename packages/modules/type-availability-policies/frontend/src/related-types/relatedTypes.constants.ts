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

/**
 * Credential types that node types of different products of one vendor list, such as Google
 * Service Account. They stay in the Credentials section but do not relate node types.
 */
export const SHARED_CREDENTIAL_TYPES: ReadonlySet<string> = new Set([
	'googleApi',
	'aws',
	'awsAssumeRole',
	'microsoftOAuth2Api',
	'microsoftEntraServicePrincipalApi',
	'atlassianServiceAccountApi',
]);

/** Node types that list the credential types of other products, so they relate no node type through them. */
export const RELATION_EXCLUDED_NODE_TYPES: ReadonlySet<string> = new Set([
	'@n8n/n8n-nodes-langchain.agent',
	'n8n-nodes-base.evaluation',
	'n8n-nodes-base.evaluationTrigger',
]);

/** They list only generic credential types but can call almost any API with a predefined credential type. */
export const ANY_CREDENTIAL_NODE_TYPES: ReadonlySet<string> = new Set([
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.graphql',
]);
