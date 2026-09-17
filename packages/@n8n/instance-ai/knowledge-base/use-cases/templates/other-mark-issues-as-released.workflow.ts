// Use case: other / Mark Issues as Released.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Release notes must mention issue ids in the form PROJ-123 for the match to work.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

const schedule = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every 15 Minutes',
		parameters: {
			rule: {
				interval: [{ field: 'minutes', minutesInterval: 15 }],
			},
		},
	},
});

// [code hosting] GitHub. Swap for GitLab or Bitbucket: replace this node only. The next node
// reads $json.published_at, $json.body and $json.tag_name.
const listReleases = node({
	type: 'n8n-nodes-base.github',
	version: 1.1,
	config: {
		name: 'List Releases',
		credentials: { githubApi: newCredential('GitHub account') },
		parameters: {
			resource: 'release',
			operation: 'getAll',
			authentication: 'accessToken',
			owner: {
				__rl: true,
				mode: 'name',
				value: placeholder('Repository owner, for example your GitHub organization'),
			},
			repository: { __rl: true, mode: 'name', value: placeholder('Repository name') },
			returnAll: false,
			limit: 5,
		},
		output: [
			{
				id: 123456,
				tag_name: 'v1.4.0',
				name: 'v1.4.0',
				body: 'Fixes PROJ-123 and PROJ-124.',
				published_at: '2026-09-17T10:00:00.000Z',
				created_at: '2026-09-17T10:00:00.000Z',
				draft: false,
				prerelease: false,
			},
		],
	},
});

// Keeps releases published in the last 15 minutes.
const newReleases = node({
	type: 'n8n-nodes-base.filter',
	version: 2.2,
	config: {
		name: 'New Releases',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.published_at }}'),
						rightValue: expr('{{ $now.minus({ minutes: 15 }).toISO() }}'),
						operator: { type: 'dateTime', operation: 'after' },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// Finds issue ids like PROJ-123 in the release notes.
const extractIssueIds = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Extract Issue Ids',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'issue_ids',
						value: expr('{{ ($json.body || "").match(/\\b[A-Z][A-Z0-9]+-\\d+\\b/g) || [] }}'),
						type: 'array',
					},
					{ id: 'a2', name: 'tag_name', value: expr('{{ $json.tag_name }}'), type: 'string' },
				],
			},
		},
	},
});

// One item per issue id, keeping the release's tag name alongside it.
const oneItemPerIssue = node({
	type: 'n8n-nodes-base.splitOut',
	version: 1,
	config: {
		name: 'One Item per Issue',
		parameters: {
			fieldToSplitOut: 'issue_ids',
			include: 'selectedOtherFields',
			fieldsToInclude: 'tag_name',
			options: { destinationFieldName: 'issue_id' },
		},
	},
});

// [issue tracker] Linear. Swap for Jira, GitHub Issues, Asana, Trello or ClickUp: replace this
// node only. It reads $json.issue_id and $json.tag_name.
// ponytail: issue_id must be what your Linear API accepts as issue id (identifier or UUID)
const addReleasedComment = node({
	type: 'n8n-nodes-base.linear',
	version: 1,
	config: {
		name: 'Add Released Comment',
		onError: 'continueRegularOutput',
		credentials: { linearApi: newCredential('Linear account') },
		parameters: {
			resource: 'comment',
			operation: 'addComment',
			authentication: 'apiToken',
			issueId: expr('{{ $json.issue_id }}'),
			comment: expr('{{ "Released in " + $json.tag_name }}'),
		},
	},
});

export default workflow('id', 'Mark Issues as Released')
	.add(schedule)
	.to(listReleases)
	.to(newReleases)
	.to(extractIssueIds)
	.to(oneItemPerIssue)
	.to(addReleasedComment);
