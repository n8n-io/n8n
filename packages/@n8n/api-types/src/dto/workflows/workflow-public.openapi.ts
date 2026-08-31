import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

// We generate OpenAPI 3.0, which marks a nullable field with `nullable: true`. OpenAPI 3.1 removed
// that keyword, and `.openapi()` accepts only the fields both versions define, so it rejects
// `nullable` outright. This adds it back.
function alsoNullable(metadata: ZodOpenAPIMetadata): ZodOpenAPIMetadata {
	return { ...metadata, nullable: true } as ZodOpenAPIMetadata;
}

// Key order below reaches the generated OpenAPI fragments verbatim, so each literal keeps the
// order the published spec already uses.

export const workflowNodeFieldDocs = {
	id: { example: '0f5532f9-36ba-4bef-86c7-30d607400b15' },
	name: { example: 'Jira' },
	type: { example: 'n8n-nodes-base.jira' },
	typeVersion: { example: 1 },
	executeOnce: { example: false },
	alwaysOutputData: { example: false },
	retryOnFail: { example: false },
	continueOnFail: { example: false, description: 'use onError instead' },
	onError: { example: 'stopWorkflow' },
	position: { example: [-100, 80] },
	// No `id` in this example: ajv reads a nested `id` as a schema `$id`, and this schema is
	// inlined at two places, so a duplicate stops the bundle compiling.
	credentials: { example: { jiraSoftwareCloudApi: { name: 'jiraApi' } } },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const workflowNodeGroupFieldDocs = {
	id: {
		description: 'Unique identifier for the node group',
		example: '9b1c8e2a-4d3f-4a6b-8c7d-1e2f3a4b5c6d',
	},
	name: { description: 'Display name of the node group', example: 'Data processing' },
	description: {
		description: 'Optional plain-text description of the node group',
		example: 'Cleans and normalizes incoming records',
	},
	nodeIds: { description: 'IDs of the nodes that belong to this group' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const workflowSettingsFieldDocs = {
	executionTimeout: { example: 3600 },
	errorWorkflow: {
		example: 'VzqKEW0ShTXA5vPj',
		description: 'The ID of the workflow that contains the error trigger node.',
	},
	timezone: { example: 'America/New_York' },
	executionOrder: { example: 'v1' },
	binaryMode: {
		description:
			"Controls how binary data is resolved from a node's input. This is a derived, internal " +
			'setting rather than something intended to be set programmatically. It is included in ' +
			'workflow responses for reference, but any value sent when creating or updating a ' +
			'workflow is ignored.',
	},
	callerPolicy: {
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
		example: '14, 18, 23',
		description:
			'Comma-separated list of workflow IDs allowed to call this workflow (only used with the ' +
			'workflowsFromAList policy)',
	},
	timeSavedMode: {
		description:
			'Controls how the time saved per execution is calculated.\n\nAvailable options:\n' +
			'- `fixed`: Uses the value in `timeSavedPerExecution`. Use when the time saved is the ' +
			'same for every execution.\n' +
			'- `dynamic`: Calculates the time saved from actual execution metrics. ' +
			'`timeSavedPerExecution` is ignored.',
	},
	timeSavedPerExecution: { description: 'Estimated time saved per execution in minutes' },
	redactionPolicy: {
		example: 'non-manual',
		description:
			'Controls whether execution data is redacted for this workflow.\n\nAvailable options:\n' +
			'- `none` (default): No redaction. All execution data is stored.\n' +
			'- `non-manual`: Redact production (non-manually triggered) executions only.\n' +
			'- `manual-only`: Redact manually triggered executions only.\n' +
			'- `all`: Redact all executions, manual and production.',
	},
	availableInMCP: {
		example: false,
		description:
			'Controls whether this workflow is reachable over the Model Context Protocol (MCP). ' +
			'Defaults to false. The workflow must be active and must hold at least one active ' +
			'Webhook node.',
	},
	credentialResolverId: {
		description:
			'ID of the credential resolver that resolves credentials for this workflow. This is a ' +
			'derived, internal setting managed through the credential resolver configuration rather ' +
			'than something intended to be set programmatically. It is included in workflow ' +
			'responses for reference, but any value sent when creating or updating a workflow is ' +
			'ignored.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const workflowCreateFieldDocs = {
	name: { example: 'Workflow 1' },
	nodes: { description: 'Nodes that make up the workflow' },
	nodeGroups: { description: 'Visual groupings of nodes shown as frames on the canvas' },
	staticData: { description: 'Data the workflow keeps between executions', example: { lastId: 1 } },
	pinData: { description: 'Pinned sample data for nodes, keyed by node name' },
	settings: { description: 'Execution and behaviour settings for the workflow' },
	projectId: {
		description:
			"Target project to create the workflow in. Defaults to the user's personal project.",
		example: 'VmwOO9HeTEj20kxM',
	},
	parentFolderId: {
		description:
			'ID of the folder to place the workflow in. Omit or null to place at the project root.',
		example: 'X8ovzm8lTQjcXRZQ',
	},
	shared: {
		description:
			'Accepted for compatibility and ignored. The owner share is derived from the target project.',
	},
	parentFolder: {
		description: 'Folder the workflow was placed in, or null at the project root',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const workflowUpdateFieldDocs = {
	description: {
		description: 'Description of the workflow',
		example: 'My workflow description',
	},
	parentFolderId: {
		writeOnly: true,
		description:
			'ID of the folder to move the workflow into. Pass null to move it to the project root; omit to leave its current folder unchanged.',
		example: 'X8ovzm8lTQjcXRZQ',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const publishIfActiveOpenApi: ZodOpenAPIMetadata = {
	description:
		"Whether to publish the update if the workflow is currently published. Set to `false` to save the change as a draft on the existing published version instead of releasing it. Has no effect on a workflow that isn't currently published.",
};

export const nodesOpenApi: ZodOpenAPIMetadata = {
	type: 'array',
	...workflowCreateFieldDocs.nodes,
	items: {
		type: 'object',
		properties: {
			id: { type: 'string', ...workflowNodeFieldDocs.id },
			name: { type: 'string', ...workflowNodeFieldDocs.name },
			webhookId: { type: 'string' },
			disabled: { type: 'boolean' },
			notesInFlow: { type: 'boolean' },
			notes: { type: 'string' },
			type: { type: 'string', ...workflowNodeFieldDocs.type },
			typeVersion: { type: 'number', ...workflowNodeFieldDocs.typeVersion },
			executeOnce: { type: 'boolean', ...workflowNodeFieldDocs.executeOnce },
			alwaysOutputData: { type: 'boolean', ...workflowNodeFieldDocs.alwaysOutputData },
			retryOnFail: { type: 'boolean', ...workflowNodeFieldDocs.retryOnFail },
			maxTries: { type: 'number' },
			waitBetweenTries: { type: 'number' },
			continueOnFail: {
				type: 'boolean',
				...workflowNodeFieldDocs.continueOnFail,
				deprecated: true,
			},
			onError: { type: 'string', ...workflowNodeFieldDocs.onError },
			position: { type: 'array', items: { type: 'number' }, ...workflowNodeFieldDocs.position },
			parameters: { type: 'object', additionalProperties: true },
			credentials: { type: 'object', ...workflowNodeFieldDocs.credentials },
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
	...workflowCreateFieldDocs.nodeGroups,
	items: {
		type: 'object',
		properties: {
			id: { type: 'string', ...workflowNodeGroupFieldDocs.id },
			name: { type: 'string', ...workflowNodeGroupFieldDocs.name },
			description: {
				type: 'string',
				maxLength: 155,
				...workflowNodeGroupFieldDocs.description,
			},
			nodeIds: { type: 'array', ...workflowNodeGroupFieldDocs.nodeIds, items: { type: 'string' } },
		},
		required: ['id', 'name', 'nodeIds'],
	},
};

export const settingsOpenApi: ZodOpenAPIMetadata = alsoNullable({
	type: 'object',
	...workflowCreateFieldDocs.settings,
	properties: {
		saveExecutionProgress: {
			oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['DEFAULT'] }],
		},
		saveManualExecutions: {
			oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['DEFAULT'] }],
		},
		saveDataErrorExecution: { type: 'string', enum: ['DEFAULT', 'all', 'none'] },
		saveDataSuccessExecution: { type: 'string', enum: ['DEFAULT', 'all', 'none'] },
		executionTimeout: { type: 'number', ...workflowSettingsFieldDocs.executionTimeout },
		errorWorkflow: { type: 'string', ...workflowSettingsFieldDocs.errorWorkflow },
		timezone: { type: 'string', ...workflowSettingsFieldDocs.timezone },
		executionOrder: { type: 'string', ...workflowSettingsFieldDocs.executionOrder },
		binaryMode: {
			type: 'string',
			enum: ['separate', 'combined'],
			...workflowSettingsFieldDocs.binaryMode,
		},
		callerPolicy: {
			type: 'string',
			enum: ['any', 'none', 'workflowsFromAList', 'workflowsFromSameOwner'],
			...workflowSettingsFieldDocs.callerPolicy,
		},
		callerIds: { type: 'string', ...workflowSettingsFieldDocs.callerIds },
		timeSavedMode: {
			type: 'string',
			enum: ['fixed', 'dynamic'],
			...workflowSettingsFieldDocs.timeSavedMode,
		},
		timeSavedPerExecution: {
			type: 'number',
			...workflowSettingsFieldDocs.timeSavedPerExecution,
		},
		redactionPolicy: {
			type: 'string',
			enum: ['none', 'non-manual', 'manual-only', 'all'],
			...workflowSettingsFieldDocs.redactionPolicy,
		},
		availableInMCP: { type: 'boolean', ...workflowSettingsFieldDocs.availableInMCP },
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
			...workflowSettingsFieldDocs.credentialResolverId,
		},
	},
});

export const staticDataOpenApi: ZodOpenAPIMetadata = alsoNullable({
	type: 'object',
	...workflowCreateFieldDocs.staticData,
});

export const pinDataOpenApi: ZodOpenAPIMetadata = alsoNullable({
	type: 'object',
	...workflowCreateFieldDocs.pinData,
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

/** `ZodOpenAPIMetadata` is a union, which will not assign into a nested `properties` slot. */
function nestingDescriptor(schema: Record<string, unknown>): ZodOpenAPIMetadata {
	return schema as ZodOpenAPIMetadata;
}

export const readOnlyTimestampOpenApi = {
	type: 'string',
	format: 'date-time',
	readOnly: true,
} as const;

const requestNodesOpenApi = nestingDescriptor({
	...nodesOpenApi,
	items: {
		...(nodesOpenApi.items as Record<string, unknown>),
		additionalProperties: false,
		properties: {
			...(nodesOpenApi.items as { properties: Record<string, unknown> }).properties,
			customTelemetryTags: {
				type: 'object',
				additionalProperties: false,
				properties: {
					tag: {
						type: 'array',
						items: {
							type: 'object',
							additionalProperties: false,
							required: ['key', 'value'],
							properties: { key: { type: 'string' }, value: { type: 'string' } },
						},
					},
				},
			},
			createdAt: readOnlyTimestampOpenApi,
			updatedAt: readOnlyTimestampOpenApi,
		},
	},
});

const requestNodeGroupsOpenApi = nestingDescriptor({
	...nodeGroupsOpenApi,
	items: {
		...(nodeGroupsOpenApi.items as Record<string, unknown>),
		additionalProperties: false,
	},
});

export const workflowCreateReadOnlyFieldDocs = {
	id: { type: 'string', readOnly: true, example: '2tUt1wbLX592XDdX' },
	active: { type: 'boolean', readOnly: true },
	createdAt: { type: 'string', format: 'date-time', readOnly: true },
	updatedAt: { type: 'string', format: 'date-time', readOnly: true },
	isArchived: { type: 'boolean', readOnly: true },
	versionId: {
		type: 'string',
		readOnly: true,
		description: 'Current version identifier used for optimistic locking',
	},
	triggerCount: {
		type: 'integer',
		readOnly: true,
		description: 'Number of active trigger nodes in the workflow',
	},
	meta: alsoNullable({
		type: 'object',
		readOnly: true,
		description: 'Workflow metadata such as template information',
		properties: {
			onboardingId: { type: 'string' },
			templateId: { type: 'string' },
			instanceId: { type: 'string' },
			templateCredsSetupCompleted: { type: 'boolean' },
		},
	}),
	tags: {
		type: 'array',
		readOnly: true,
		items: {
			type: 'object',
			additionalProperties: false,
			required: ['name'],
			properties: {
				id: { type: 'string', readOnly: true, example: '2tUt1wbLX592XDdX' },
				name: { type: 'string', example: 'Production' },
				createdAt: { type: 'string', format: 'date-time', readOnly: true },
				updatedAt: { type: 'string', format: 'date-time', readOnly: true },
			},
		},
	},
	activeVersion: nestingDescriptor({
		type: 'object',
		readOnly: true,
		nullable: true,
		additionalProperties: false,
		properties: {
			versionId: {
				type: 'string',
				readOnly: true,
				description: 'Unique identifier for this workflow version',
				example: '7c6b9e3f-8d4a-4b2c-9f1e-6a5d3b8c7e4f',
			},
			workflowId: {
				type: 'string',
				readOnly: true,
				description: 'The workflow this version belongs to',
				example: '2tUt1wbLX592XDdX',
			},
			nodes: { ...requestNodesOpenApi, readOnly: true },
			connections: { ...connectionsOpenApi, readOnly: true },
			nodeGroups: { ...requestNodeGroupsOpenApi, readOnly: true },
			authors: {
				type: 'string',
				readOnly: true,
				description: 'Comma-separated list of author IDs who contributed to this version',
				example: '1,2,3',
			},
			name: {
				type: 'string',
				nullable: true,
				readOnly: true,
				description: 'Optional name for this workflow version',
				example: 'Production release',
			},
			description: {
				type: 'string',
				nullable: true,
				readOnly: true,
				description: 'Optional description for this workflow version',
			},
			autosaved: {
				type: 'boolean',
				readOnly: true,
				description: 'Whether this version was created by autosave',
			},
			createdAt: { type: 'string', format: 'date-time', readOnly: true },
			updatedAt: { type: 'string', format: 'date-time', readOnly: true },
		},
	}),
} satisfies Record<string, ZodOpenAPIMetadata>;
