// Use case: other / Workflow Backups to a Git Repository.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Fill in OWNER and REPO below: the repository that stores the backups.
import { workflow, node, trigger, newCredential, expr } from '@n8n/workflow-sdk';

const OWNER = 'your-org'; // GitHub organization or user that owns the backup repository
const REPO = 'workflow-backups'; // repository name

const schedule = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every 12 Hours',
		parameters: {
			rule: {
				interval: [{ field: 'hours', hoursInterval: 12 }],
			},
		},
	},
});

// Lists the workflows of this n8n instance. One item per workflow. The next node reads
// $json.id.
const listWorkflows = node({
	type: 'n8n-nodes-base.n8n',
	version: 1,
	config: {
		name: 'List Workflows',
		credentials: { n8nApi: newCredential('n8n API') },
		parameters: {
			resource: 'workflow',
			operation: 'getAll',
			returnAll: true,
			filters: {},
		},
		output: [
			{
				id: 'wf_1',
				name: 'Sample Workflow',
				active: true,
				nodes: [
					{
						id: 'n1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
				updatedAt: '2026-09-17T08:00:00.000Z',
			},
		],
	},
});

// [code hosting] Tool. Swap for another code hosting service: replace this node and Commit
// File below. It reads $json.id. Continues past a 404 so a new workflow counts as changed.
const getStoredFile = node({
	type: 'n8n-nodes-base.github',
	version: 1.1,
	config: {
		name: 'Get Stored File',
		onError: 'continueRegularOutput',
		credentials: { githubApi: newCredential('GitHub account') },
		parameters: {
			resource: 'file',
			operation: 'get',
			authentication: 'accessToken',
			owner: { __rl: true, mode: 'name', value: OWNER },
			repository: { __rl: true, mode: 'name', value: REPO },
			filePath: expr('{{ "workflows/" + $json.id + ".json" }}'),
			asBinaryProperty: false,
		},
		output: [
			{
				name: 'wf_1.json',
				path: 'workflows/wf_1.json',
				sha: 'deadbeefcafe0001',
				encoding: 'base64',
				content: 'eyJpZCI6IndmXzEiLCJuYW1lIjoiU2FtcGxlIFdvcmtmbG93IChvbGQpIn0=',
			},
		],
	},
});

// ponytail: one file per workflow, no deletion of removed workflows
// Builds the file path and the JSON to store, and compares it with the stored file.
const compareVersions = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Compare Versions',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'id',
						value: expr(`{{ $('List Workflows').item.json.id }}`),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'path',
						value: expr(`{{ "workflows/" + $('List Workflows').item.json.id + ".json" }}`),
						type: 'string',
					},
					{ id: 'a3', name: 'sha', value: expr('{{ $json.sha || "" }}'), type: 'string' },
					{
						id: 'a4',
						name: 'new_content',
						value: expr(
							`{{ JSON.stringify({ id: $('List Workflows').item.json.id, name: $('List Workflows').item.json.name, nodes: $('List Workflows').item.json.nodes, connections: $('List Workflows').item.json.connections }, null, 2) }}`,
						),
						type: 'string',
					},
					{
						id: 'a5',
						name: 'changed',
						value: expr(
							`{{ !$json.content || ($json.content.base64Decode() !== JSON.stringify({ id: $('List Workflows').item.json.id, name: $('List Workflows').item.json.name, nodes: $('List Workflows').item.json.nodes, connections: $('List Workflows').item.json.connections }, null, 2)) }}`,
						),
						type: 'boolean',
					},
				],
			},
		},
	},
});

// Keeps only the workflows that are new or whose stored file no longer matches.
const changedWorkflows = node({
	type: 'n8n-nodes-base.filter',
	version: 2.2,
	config: {
		name: 'Changed Workflows',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.changed }}'),
						rightValue: '',
						operator: { type: 'boolean', operation: 'true', singleValue: true },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// [code hosting] Tool. Swap for another code hosting service: replace this node and Get
// Stored File above. It reads $json.path, $json.new_content and $json.sha.
const commitFile = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Commit File',
		credentials: { githubApi: newCredential('GitHub account') },
		parameters: {
			method: 'PUT',
			url: expr(`{{ "https://api.github.com/repos/${OWNER}/${REPO}/contents/" + $json.path }}`),
			authentication: 'predefinedCredentialType',
			nodeCredentialType: 'githubApi',
			sendBody: true,
			specifyBody: 'json',
			jsonBody: expr(
				`{{ $json.sha ? { message: "Backup: " + $json.path, content: $json.new_content.base64Encode(), sha: $json.sha } : { message: "Backup: " + $json.path, content: $json.new_content.base64Encode() } }}`,
			),
		},
	},
});

export default workflow('id', 'Workflow Backups to a Git Repository')
	.add(schedule)
	.to(listWorkflows)
	.to(getStoredFile)
	.to(compareVersions)
	.to(changedWorkflows)
	.to(commitFile);
