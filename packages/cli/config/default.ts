module.exports = {
	urls: {
		endpointRest: 'rest',
		endpointWebhook: 'webhook',
		endpointWebhookTest: 'webhook-test',
		host: 'localhost',
		port: 5678,
		protocol: 'http',
	},
	database: {
		type: 'sqlite', // Available types: sqlite, mongodb

		// MongoDB specific settings
		mongodbConfig: {
			url: 'mongodb://user:password@localhost:27017/database',
		},
	},

	executions: {
		saveManualRuns: false,
	},

	nodes: {
		// Nodes not to load even if found
		// exclude: ['n8n-nodes-base.executeCommand'],
		errorTriggerType: 'n8n-nodes-base.errorTrigger',
	},

	timezone: 'America/New_York',
};
