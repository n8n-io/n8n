// This file ensures n8n can find and load your nodes and credentials
const { McpClient } = require('./dist/nodes/McpClient/McpClient.node.js');

module.exports = {
	nodeTypes: {
		mcpClient: McpClient,
	},
	credentialTypes: {
		mcpClientApi: require('./dist/credentials/McpClientApi.credentials.js').McpClientApi,
		mcpClientSseApi: require('./dist/credentials/McpClientSseApi.credentials.js').McpClientSseApi,
	},
};
