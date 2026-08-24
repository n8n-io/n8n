import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

// We generate OpenAPI 3.0, which marks a nullable field with `nullable: true`. OpenAPI 3.1 removed
// that keyword, and `.openapi()` accepts only the fields both versions define, so it rejects
// `nullable` outright. This adds it back.
function alsoNullable(metadata: ZodOpenAPIMetadata): ZodOpenAPIMetadata {
	return { ...metadata, nullable: true } as ZodOpenAPIMetadata;
}

export const nodesOpenApi: ZodOpenAPIMetadata = {
	type: 'array',
	description: 'Nodes that make up the workflow',
	items: {
		type: 'object',
		properties: {
			id: { type: 'string', example: '0f5532f9-36ba-4bef-86c7-30d607400b15' },
			name: { type: 'string', example: 'Jira' },
			webhookId: { type: 'string' },
			disabled: { type: 'boolean' },
			notesInFlow: { type: 'boolean' },
			notes: { type: 'string' },
			type: { type: 'string', example: 'n8n-nodes-base.jira' },
			typeVersion: { type: 'number', example: 1 },
			executeOnce: { type: 'boolean', example: false },
			alwaysOutputData: { type: 'boolean', example: false },
			retryOnFail: { type: 'boolean', example: false },
			maxTries: { type: 'number' },
			waitBetweenTries: { type: 'number' },
			continueOnFail: {
				type: 'boolean',
				example: false,
				description: 'use onError instead',
				deprecated: true,
			},
			onError: { type: 'string', example: 'stopWorkflow' },
			position: { type: 'array', items: { type: 'number' }, example: [-100, 80] },
			parameters: { type: 'object', additionalProperties: true },
			// No `id` in this example: ajv reads a nested `id` as a schema `$id`, and this schema is
			// inlined at two places, so a duplicate stops the bundle compiling.
			credentials: {
				type: 'object',
				example: { jiraSoftwareCloudApi: { name: 'jiraApi' } },
			},
			customTelemetryTags: {
				type: 'object',
				properties: {
					tag: {
						type: 'array',
						items: {
							type: 'object',
							properties: { key: { type: 'string' }, value: { type: 'string' } },
							required: ['key', 'value'],
						},
					},
				},
			},
			createdAt: { type: 'string', format: 'date-time' },
			updatedAt: { type: 'string', format: 'date-time' },
		},
	},
};

export const connectionsOpenApi: ZodOpenAPIMetadata = {
	type: 'object',
	description: 'Connections between nodes, keyed by source node name',
	example: { Jira: { main: [[{ node: 'Jira', type: 'main', index: 0 }]] } },
};

export const nodeGroupsOpenApi: ZodOpenAPIMetadata = {
	type: 'array',
	description: 'Visual groupings of nodes shown as frames on the canvas',
	items: {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				description: 'Unique identifier for the node group',
				example: '9b1c8e2a-4d3f-4a6b-8c7d-1e2f3a4b5c6d',
			},
			name: {
				type: 'string',
				description: 'Display name of the node group',
				example: 'Data processing',
			},
			description: {
				type: 'string',
				maxLength: 155,
				description: 'Optional plain-text description of the node group',
				example: 'Cleans and normalizes incoming records',
			},
			nodeIds: {
				type: 'array',
				description: 'IDs of the nodes that belong to this group',
				items: { type: 'string' },
			},
		},
		required: ['id', 'name', 'nodeIds'],
	},
};

export const settingsOpenApi: ZodOpenAPIMetadata = alsoNullable({
	type: 'object',
	description: 'Execution and behaviour settings for the workflow',
	properties: {
		saveExecutionProgress: {
			oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['DEFAULT'] }],
		},
		saveManualExecutions: {
			oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['DEFAULT'] }],
		},
		saveDataErrorExecution: { type: 'string', enum: ['DEFAULT', 'all', 'none'] },
		saveDataSuccessExecution: { type: 'string', enum: ['DEFAULT', 'all', 'none'] },
		executionTimeout: { type: 'number', example: 3600 },
		errorWorkflow: {
			type: 'string',
			example: 'VzqKEW0ShTXA5vPj',
			description: 'The ID of the workflow that contains the error trigger node.',
		},
		timezone: { type: 'string', example: 'America/New_York' },
		executionOrder: { type: 'string', example: 'v1' },
		binaryMode: {
			type: 'string',
			enum: ['separate', 'combined'],
			description:
				"Controls how binary data is resolved from a node's input. This is a derived, internal " +
				'setting rather than something intended to be set programmatically. It is included in ' +
				'workflow responses for reference, but any value sent when creating or updating a ' +
				'workflow is ignored.',
		},
		callerPolicy: {
			type: 'string',
			enum: ['any', 'none', 'workflowsFromAList', 'workflowsFromSameOwner'],
			example: 'workflowsFromSameOwner',
			description:
				'Controls which workflows are allowed to call this workflow using the Execute Workflow ' +
				'node. Defaults to workflowsFromSameOwner.\n\nAvailable options:\n' +
				'- `any`: Any workflow can call this workflow (no restrictions)\n' +
				'- `none`: No other workflows can call this workflow (completely blocked)\n' +
				'- `workflowsFromSameOwner` (default): Only workflows owned by the same project can ' +
				'call this workflow\n' +
				'- `workflowsFromAList`: Only the workflows listed in `callerIds` can call this workflow',
		},
		callerIds: {
			type: 'string',
			example: '14, 18, 23',
			description:
				'Comma-separated list of workflow IDs allowed to call this workflow (only used with the ' +
				'workflowsFromAList policy)',
		},
		timeSavedMode: {
			type: 'string',
			enum: ['fixed', 'dynamic'],
			description:
				'Controls how the time saved per execution is calculated.\n\nAvailable options:\n' +
				'- `fixed`: Uses the value in `timeSavedPerExecution`. Use when the time saved is the ' +
				'same for every execution.\n' +
				'- `dynamic`: Calculates the time saved from actual execution metrics. ' +
				'`timeSavedPerExecution` is ignored.',
		},
		timeSavedPerExecution: {
			type: 'number',
			description: 'Estimated time saved per execution in minutes',
		},
		redactionPolicy: {
			type: 'string',
			enum: ['none', 'non-manual', 'manual-only', 'all'],
			example: 'non-manual',
			description:
				'Controls whether execution data is redacted for this workflow.\n\nAvailable options:\n' +
				'- `none` (default): No redaction. All execution data is stored.\n' +
				'- `non-manual`: Redact production (non-manually triggered) executions only.\n' +
				'- `manual-only`: Redact manually triggered executions only.\n' +
				'- `all`: Redact all executions, manual and production.',
		},
		availableInMCP: {
			type: 'boolean',
			example: false,
			description:
				'Controls whether this workflow is reachable over the Model Context Protocol (MCP). ' +
				'Defaults to false. The workflow must be active and must hold at least one active ' +
				'Webhook node.',
		},
		customTelemetryTags: {
			type: 'array',
			items: {
				type: 'object',
				properties: { key: { type: 'string' }, value: { type: 'string' } },
				required: ['key', 'value'],
			},
		},
		credentialResolverId: {
			type: 'string',
			description:
				'ID of the credential resolver that resolves credentials for this workflow. This is a ' +
				'derived, internal setting managed through the credential resolver configuration rather ' +
				'than something intended to be set programmatically. It is included in workflow ' +
				'responses for reference, but any value sent when creating or updating a workflow is ' +
				'ignored.',
		},
	},
});

export const staticDataOpenApi: ZodOpenAPIMetadata = alsoNullable({
	type: 'object',
	description: 'Data the workflow keeps between executions',
	example: { lastId: 1 },
});

export const pinDataOpenApi: ZodOpenAPIMetadata = alsoNullable({
	type: 'object',
	description: 'Pinned sample data for nodes, keyed by node name',
});

export const metaOpenApi: ZodOpenAPIMetadata = alsoNullable({
	type: 'object',
	description: 'Workflow metadata such as template information',
	properties: {
		onboardingId: { type: 'string' },
		templateId: { type: 'string' },
		instanceId: { type: 'string' },
		templateCredsSetupCompleted: { type: 'boolean' },
	},
});
