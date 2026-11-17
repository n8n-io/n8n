import type { INodeTypeDescription } from 'n8n-workflow';

/** Only nodes that ship with n8n may run with a brokered credential. */
const ALLOWED_PACKAGE_PREFIXES = ['n8n-nodes-base.', '@n8n/n8n-nodes-langchain.'];

/**
 * Nodes that send requests to a caller-chosen destination or run caller-chosen
 * code. A brokered credential must only reach the service it belongs to.
 */
const GENERIC_NODE_DENYLIST = new Set([
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.graphql',
	'n8n-nodes-base.code',
	'n8n-nodes-base.function',
	'n8n-nodes-base.functionItem',
	'n8n-nodes-base.executeCommand',
	'n8n-nodes-base.ssh',
	'n8n-nodes-base.readWriteFile',
	'n8n-nodes-base.readBinaryFile',
	'n8n-nodes-base.readBinaryFiles',
	'n8n-nodes-base.writeBinaryFile',
	'n8n-nodes-base.executeWorkflow',
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.respondToWebhook',
	'@n8n/n8n-nodes-langchain.code',
	'@n8n/n8n-nodes-langchain.toolCode',
	'@n8n/n8n-nodes-langchain.toolHttpRequest',
	'@n8n/n8n-nodes-langchain.mcpClient',
	'@n8n/n8n-nodes-langchain.mcpClientTool',
]);

/** Credential types that are not tied to one service. */
const GENERIC_CREDENTIAL_TYPES = new Set([
	'httpBasicAuth',
	'httpBearerAuth',
	'httpDigestAuth',
	'httpHeaderAuth',
	'httpMultipleHeadersAuth',
	'httpQueryAuth',
	'httpCustomAuth',
	'httpSslAuth',
	'oAuth1Api',
	'oAuth2Api',
]);

export function isGenericCredentialType(credentialType: string): boolean {
	return GENERIC_CREDENTIAL_TYPES.has(credentialType);
}

/**
 * A cheap first filter on the node name alone. `getNodeRefusalReason` is the
 * full check and needs the node description.
 */
export function isCandidateNodeName(name: string): boolean {
	return (
		ALLOWED_PACKAGE_PREFIXES.some((prefix) => name.startsWith(prefix)) &&
		!GENERIC_NODE_DENYLIST.has(name) &&
		!name.endsWith('Trigger')
	);
}

function hasMainOutput(description: INodeTypeDescription): boolean {
	const { outputs } = description;
	if (!Array.isArray(outputs)) return true;
	return outputs.some((output) => (typeof output === 'string' ? output : output.type) === 'main');
}

function hasCredentialSelector(description: INodeTypeDescription): boolean {
	return (description.properties ?? []).some((property) => property.type === 'credentialsSelect');
}

/** Returns why a node type cannot run with a brokered credential, or `null` when it can. */
export function getNodeRefusalReason(description: INodeTypeDescription): string | null {
	const { name } = description;
	if (!ALLOWED_PACKAGE_PREFIXES.some((prefix) => name.startsWith(prefix))) {
		return 'Only nodes that ship with n8n can run through MCP.';
	}
	if (GENERIC_NODE_DENYLIST.has(name) || hasCredentialSelector(description)) {
		return 'This node can send data to any destination, so it cannot run through MCP.';
	}
	if (description.group?.includes('trigger') || description.polling || name.endsWith('Trigger')) {
		return 'Trigger nodes cannot run through MCP.';
	}
	if (!hasMainOutput(description)) {
		return 'This node only works as part of an AI agent, so it cannot run through MCP.';
	}
	return null;
}

export function nodeDeclaresCredential(
	description: INodeTypeDescription,
	credentialType: string,
): boolean {
	return description.credentials?.some(({ name }) => name === credentialType) ?? false;
}
