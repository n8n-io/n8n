module.exports = {
	urls: {
		// Default path of the rest-endpoint
		endpointRest: 'rest',
		// Default path of the webhook-endpoint
		endpointWebhook: 'webhook',
		// Default path of the webhook-endpoint for testing
		endpointWebhookTest: 'webhook-test',

		// How n8n can be reached (Editor & REST-API)
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
		// If a workflow executes all the data gets saved by default. This
		// could be a problem when a workflow gets executed a lot and processes
		// a lot of data. To not write the database full it is possible to
		// not save the execution at all.
		// Depending on if the execution did succeed or error a different
		// save behaviour can be set.
		saveDataErrorExecution: 'all', // Available options: all, none
		saveDataSuccessExecution: 'all', // Available options: all, none

		// If the executions of workflows which got started via the editor
		// should be saved. By default they will not be saved as this runs
		// are normally only for testing and debugging. This setting can
		// also be overwritten on a per workflow basis in the workflow settings
		// in the editor.
		saveManualExecutions: false,
	},

	nodes: {
		// Nodes not to load even if found
		// exclude: ['n8n-nodes-base.executeCommand'],
		errorTriggerType: 'n8n-nodes-base.errorTrigger',
	},

	// The timezone to use. Is important for nodes like "Cron" which start the
	// workflow automatically at a specified time. This setting can also be
	// overwritten on a per worfklow basis in the workflow settings in the
	// editor.
	timezone: 'America/New_York',
};
