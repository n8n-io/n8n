// Payload corpus for the master-vs-branch Public API parity diff.
// Each case is fired verbatim at both instances; status + normalized body must match exactly.

const fullNode = {
	id: '0f5532f9-36ba-4bef-86c7-30d607400b15',
	name: 'Start',
	type: 'n8n-nodes-base.start',
	typeVersion: 1,
	position: [100, 200],
	parameters: {},
};

const minimal = {
	name: 'Parity Workflow',
	nodes: [],
	connections: {},
	settings: {},
};

const withNode = {
	...minimal,
	nodes: [fullNode],
	connections: {},
};

/** @type {Array<{name: string, body: unknown}>} */
export const bodyCases = [
	{ name: 'minimal', body: minimal },
	{ name: 'with-one-node', body: withNode },

	// --- required fields ---
	{ name: 'missing-name', body: { nodes: [], connections: {}, settings: {} } },
	{ name: 'missing-nodes', body: { name: 'W', connections: {}, settings: {} } },
	{ name: 'missing-connections', body: { name: 'W', nodes: [], settings: {} } },
	{ name: 'missing-settings', body: { name: 'W', nodes: [], connections: {} } },
	{ name: 'empty-object', body: {} },
	{ name: 'name-wrong-type', body: { ...minimal, name: 42 } },
	{ name: 'name-null', body: { ...minimal, name: null } },
	{ name: 'nodes-not-array', body: { ...minimal, nodes: {} } },
	{ name: 'nodes-null', body: { ...minimal, nodes: null } },
	{ name: 'connections-array', body: { ...minimal, connections: [] } },
	{ name: 'connections-null', body: { ...minimal, connections: null } },
	{ name: 'connections-string', body: { ...minimal, connections: 'x' } },
	{ name: 'settings-array', body: { ...minimal, settings: [] } },
	{ name: 'settings-null', body: { ...minimal, settings: null } },

	// --- create-only / update-only fields ---
	{ name: 'field-description', body: { ...minimal, description: 'A description' } },
	{ name: 'field-description-null', body: { ...minimal, description: null } },
	{ name: 'field-description-number', body: { ...minimal, description: 7 } },
	{ name: 'field-projectId', body: { ...minimal, projectId: 'REPLACE_PROJECT_ID' } },
	{ name: 'field-projectId-null', body: { ...minimal, projectId: null } },
	{ name: 'field-projectId-number', body: { ...minimal, projectId: 7 } },

	// --- unknown keys ---
	{ name: 'unknown-key', body: { ...minimal, bogus: 1 } },
	{ name: 'unknown-key-typo', body: { ...minimal, nam: 'typo' } },
	{ name: 'two-unknown-keys', body: { ...minimal, bogus: 1, alsoBogus: 2 } },

	// --- server-managed (readOnly in the old spec) ---
	{ name: 'ro-id', body: { ...minimal, id: 'aaaaaaaaaaaaaaaa' } },
	{ name: 'ro-active', body: { ...minimal, active: true } },
	{ name: 'ro-createdAt', body: { ...minimal, createdAt: '2024-01-01T00:00:00.000Z' } },
	{ name: 'ro-updatedAt', body: { ...minimal, updatedAt: '2024-01-01T00:00:00.000Z' } },
	{ name: 'ro-isArchived', body: { ...minimal, isArchived: true } },
	{ name: 'ro-versionId', body: { ...minimal, versionId: 'v1' } },
	{ name: 'ro-triggerCount', body: { ...minimal, triggerCount: 3 } },
	{ name: 'ro-meta', body: { ...minimal, meta: { templateId: 't1' } } },
	{ name: 'ro-tags', body: { ...minimal, tags: [{ id: 't1', name: 'prod' }] } },
	{ name: 'ro-shared', body: { ...minimal, shared: [{ role: 'workflow:owner' }] } },
	{ name: 'ro-activeVersion', body: { ...minimal, activeVersion: { versionId: 'v1' } } },
	{ name: 'ro-two-at-once', body: { ...minimal, id: 'aaaaaaaaaaaaaaaa', active: true } },

	// --- parentFolderId ---
	{ name: 'parentFolderId-null', body: { ...minimal, parentFolderId: null } },
	{ name: 'parentFolderId-missing-folder', body: { ...minimal, parentFolderId: 'nope' } },
	{ name: 'parentFolderId-number', body: { ...minimal, parentFolderId: 7 } },

	// --- staticData ---
	{ name: 'staticData-object', body: { ...minimal, staticData: { lastId: 1 } } },
	{ name: 'staticData-json-string', body: { ...minimal, staticData: '{"lastId":1}' } },
	{ name: 'staticData-invalid-json-string', body: { ...minimal, staticData: 'not json' } },
	{ name: 'staticData-null', body: { ...minimal, staticData: null } },
	{ name: 'staticData-number', body: { ...minimal, staticData: 7 } },
	{ name: 'staticData-array', body: { ...minimal, staticData: [] } },

	// --- pinData ---
	{ name: 'pinData-object', body: { ...minimal, pinData: { Start: [{ json: {} }] } } },
	{ name: 'pinData-null', body: { ...minimal, pinData: null } },
	{ name: 'pinData-array', body: { ...minimal, pinData: [] } },
	{ name: 'pinData-string', body: { ...minimal, pinData: 'x' } },

	// --- nodeGroups ---
	{
		name: 'nodeGroups-full',
		body: { ...minimal, nodeGroups: [{ id: 'g1', name: 'G', nodeIds: [], description: 'd' }] },
	},
	{
		name: 'nodeGroups-minimal',
		body: { ...minimal, nodeGroups: [{ id: 'g1', name: 'G', nodeIds: [] }] },
	},
	{ name: 'nodeGroups-missing-id', body: { ...minimal, nodeGroups: [{ name: 'G', nodeIds: [] }] } },
	{
		name: 'nodeGroups-missing-name',
		body: { ...minimal, nodeGroups: [{ id: 'g1', nodeIds: [] }] },
	},
	{
		name: 'nodeGroups-missing-nodeIds',
		body: { ...minimal, nodeGroups: [{ id: 'g1', name: 'G' }] },
	},
	{
		name: 'nodeGroups-unknown-key',
		body: { ...minimal, nodeGroups: [{ id: 'g1', name: 'G', nodeIds: [], bogus: 1 }] },
	},
	{
		name: 'nodeGroups-desc-155',
		body: {
			...minimal,
			nodeGroups: [{ id: 'g1', name: 'G', nodeIds: [], description: 'x'.repeat(155) }],
		},
	},
	{
		name: 'nodeGroups-desc-156',
		body: {
			...minimal,
			nodeGroups: [{ id: 'g1', name: 'G', nodeIds: [], description: 'x'.repeat(156) }],
		},
	},
	{
		name: 'nodeGroups-desc-146',
		body: {
			...minimal,
			nodeGroups: [{ id: 'g1', name: 'G', nodeIds: [], description: 'x'.repeat(146) }],
		},
	},
	{ name: 'nodeGroups-not-array', body: { ...minimal, nodeGroups: {} } },
	{ name: 'nodeGroups-scalar-items', body: { ...minimal, nodeGroups: [1, 2] } },
	{
		name: 'nodeGroups-nodeIds-not-array',
		body: { ...minimal, nodeGroups: [{ id: 'g1', name: 'G', nodeIds: 'x' }] },
	},
	{
		name: 'nodeGroups-nodeIds-numbers',
		body: { ...minimal, nodeGroups: [{ id: 'g1', name: 'G', nodeIds: [1] }] },
	},
	{ name: 'nodeGroups-null', body: { ...minimal, nodeGroups: null } },

	// --- settings ---
	{
		name: 'settings-all-documented',
		body: {
			...minimal,
			settings: {
				saveExecutionProgress: true,
				saveManualExecutions: false,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'none',
				executionTimeout: 3600,
				errorWorkflow: 'VzqKEW0ShTXA5vPj',
				timezone: 'America/New_York',
				executionOrder: 'v1',
				callerPolicy: 'workflowsFromAList',
				callerIds: '14, 18, 23',
				timeSavedMode: 'fixed',
				timeSavedPerExecution: 5,
				redactionPolicy: 'non-manual',
				availableInMCP: false,
				customTelemetryTags: [{ key: 'team', value: 'platform' }],
			},
		},
	},
	{ name: 'settings-binaryMode', body: { ...minimal, settings: { binaryMode: 'separate' } } },
	{
		name: 'settings-credentialResolverId',
		body: { ...minimal, settings: { credentialResolverId: 'r1' } },
	},
	{ name: 'settings-unknown', body: { ...minimal, settings: { bogusSetting: true } } },
	{
		name: 'settings-bad-enum-saveDataErrorExecution',
		body: { ...minimal, settings: { saveDataErrorExecution: 'bogus' } },
	},
	{
		name: 'settings-bad-enum-callerPolicy',
		body: { ...minimal, settings: { callerPolicy: 'bogus' } },
	},
	{
		name: 'settings-bad-enum-timeSavedMode',
		body: { ...minimal, settings: { timeSavedMode: 'bogus' } },
	},
	{
		name: 'settings-bad-enum-redactionPolicy',
		body: { ...minimal, settings: { redactionPolicy: 'bogus' } },
	},
	{ name: 'settings-bad-enum-binaryMode', body: { ...minimal, settings: { binaryMode: 'bogus' } } },
	{
		name: 'settings-executionTimeout-string',
		body: { ...minimal, settings: { executionTimeout: 'x' } },
	},
	{
		name: 'settings-executionTimeout-huge',
		body: { ...minimal, settings: { executionTimeout: 999999 } },
	},
	{
		name: 'settings-executionTimeout-float',
		body: { ...minimal, settings: { executionTimeout: 1.5 } },
	},
	{ name: 'settings-timezone-number', body: { ...minimal, settings: { timezone: 42 } } },
	{
		name: 'settings-availableInMCP-string',
		body: { ...minimal, settings: { availableInMCP: 'yes' } },
	},
	{
		name: 'settings-tags-missing-value',
		body: { ...minimal, settings: { customTelemetryTags: [{ key: 'team' }] } },
	},
	{
		name: 'settings-tags-extra-key',
		body: { ...minimal, settings: { customTelemetryTags: [{ key: 'a', value: 'b', extra: 1 }] } },
	},
	{ name: 'settings-tags-not-array', body: { ...minimal, settings: { customTelemetryTags: {} } } },
	{ name: 'settings-errorWorkflow-number', body: { ...minimal, settings: { errorWorkflow: 7 } } },
	{ name: 'settings-executionOrder-number', body: { ...minimal, settings: { executionOrder: 1 } } },
	{ name: 'settings-callerIds-number', body: { ...minimal, settings: { callerIds: 14 } } },
	{
		name: 'settings-timeSavedPerExecution-string',
		body: { ...minimal, settings: { timeSavedPerExecution: 'x' } },
	},
	{
		name: 'settings-saveExecutionProgress-string',
		body: { ...minimal, settings: { saveExecutionProgress: 'true' } },
	},

	// --- nodes: node.yml is additionalProperties:false in the old spec ---
	{ name: 'node-empty-object', body: { ...minimal, nodes: [{}] } },
	{ name: 'node-unknown-prop', body: { ...minimal, nodes: [{ ...fullNode, bogusProp: 1 }] } },
	{
		name: 'node-extendsCredential',
		body: { ...minimal, nodes: [{ ...fullNode, extendsCredential: 'x' }] },
	},
	{
		name: 'node-rewireOutputLogTo',
		body: { ...minimal, nodes: [{ ...fullNode, rewireOutputLogTo: 'main' }] },
	},
	{
		name: 'node-forceCustomOperation',
		body: {
			...minimal,
			nodes: [{ ...fullNode, forceCustomOperation: { resource: 'a', operation: 'b' } }],
		},
	},
	{ name: 'node-scalar', body: { ...minimal, nodes: ['x'] } },
	{ name: 'node-null-item', body: { ...minimal, nodes: [null] } },
	{ name: 'node-name-number', body: { ...minimal, nodes: [{ ...fullNode, name: 7 }] } },
	{
		name: 'node-typeVersion-string',
		body: { ...minimal, nodes: [{ ...fullNode, typeVersion: '1' }] },
	},
	{
		name: 'node-position-strings',
		body: { ...minimal, nodes: [{ ...fullNode, position: ['a', 'b'] }] },
	},
	{
		name: 'node-position-object',
		body: { ...minimal, nodes: [{ ...fullNode, position: { x: 1 } }] },
	},
	{ name: 'node-parameters-array', body: { ...minimal, nodes: [{ ...fullNode, parameters: [] }] } },
	{
		name: 'node-credentials-string',
		body: { ...minimal, nodes: [{ ...fullNode, credentials: 'x' }] },
	},
	{
		name: 'node-readonly-createdAt',
		body: { ...minimal, nodes: [{ ...fullNode, createdAt: '2024-01-01T00:00:00.000Z' }] },
	},
	{ name: 'node-disabled-string', body: { ...minimal, nodes: [{ ...fullNode, disabled: 'yes' }] } },
	{
		name: 'node-continueOnFail',
		body: { ...minimal, nodes: [{ ...fullNode, continueOnFail: true }] },
	},
	{
		name: 'node-customTelemetryTags-ok',
		body: {
			...minimal,
			nodes: [{ ...fullNode, customTelemetryTags: { tag: [{ key: 'a', value: 'b' }] } }],
		},
	},
	{
		name: 'node-customTelemetryTags-bad',
		body: { ...minimal, nodes: [{ ...fullNode, customTelemetryTags: { tag: [{ key: 'a' }] } }] },
	},
	{ name: 'node-webhookId', body: { ...minimal, nodes: [{ ...fullNode, webhookId: 'wh1' }] } },
	{
		name: 'node-notes',
		body: { ...minimal, nodes: [{ ...fullNode, notes: 'hello', notesInFlow: true }] },
	},
	{
		name: 'node-maxTries',
		body: {
			...minimal,
			nodes: [{ ...fullNode, retryOnFail: true, maxTries: 3, waitBetweenTries: 1000 }],
		},
	},
	{
		name: 'node-onError',
		body: { ...minimal, nodes: [{ ...fullNode, onError: 'continueRegularOutput' }] },
	},
	{
		name: 'node-executeOnce',
		body: { ...minimal, nodes: [{ ...fullNode, executeOnce: true, alwaysOutputData: true }] },
	},

	// --- body-level type errors ---
	{ name: 'body-array', body: [] },
	{ name: 'body-string', body: 'x' },
	{ name: 'body-null', body: null },
	{ name: 'body-number', body: 5 },
];

export const minimalWorkflow = minimal;
