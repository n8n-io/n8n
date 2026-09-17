// Use case: engineering / Release notes draft.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// [code hosting] GitHub. Swap for GitLab or Bitbucket: replace this node and the two
// other code hosting nodes. The next nodes read $json.ref, $json.ref_type and
// $json.repository.full_name.
const tagPushed = trigger({
	type: 'n8n-nodes-base.githubTrigger',
	version: 1,
	config: {
		name: 'Tag Pushed',
		credentials: { githubApi: newCredential('GitHub account') },
		parameters: {
			authentication: 'accessToken',
			owner: { __rl: true, mode: 'name', value: placeholder('GitHub owner (org or username)') },
			repository: { __rl: true, mode: 'name', value: placeholder('Repository name') },
			events: ['create'],
		},
		output: [{ ref: 'v1.4.0', ref_type: 'tag', repository: { full_name: 'acme/api' } }],
	},
});

// [code hosting] GitHub: the recently closed pull requests.
const getClosedPRs = node({
	type: 'n8n-nodes-base.github',
	version: 1.1,
	config: {
		name: 'Get Closed PRs',
		credentials: { githubApi: newCredential('GitHub account') },
		parameters: {
			resource: 'repository',
			operation: 'getPullRequests',
			authentication: 'accessToken',
			owner: { __rl: true, mode: 'name', value: placeholder('GitHub owner (org or username)') },
			repository: { __rl: true, mode: 'name', value: placeholder('Repository name') },
			returnAll: false,
			limit: 50,
			getRepositoryPullRequestsFilters: { state: 'closed', sort: 'updated', direction: 'desc' },
		},
		output: [
			{
				number: 42,
				title: 'Fix authentication bug',
				html_url: 'https://github.com/acme/api/pull/42',
				merged_at: '2026-09-14T10:00:00.000Z',
				user: { login: 'alice' },
			},
			{
				number: 40,
				title: 'Closed without merge',
				html_url: 'https://github.com/acme/api/pull/40',
				merged_at: null,
				user: { login: 'bob' },
			},
		],
	},
});

// Keeps pull requests merged in the last 30 days, only when a tag was just pushed.
// ponytail: 30-day window; use the previous release date if you tag less often.
const mergedSinceLastTag = node({
	type: 'n8n-nodes-base.filter',
	version: 2.2,
	config: {
		name: 'Merged Since Last Tag',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr("{{ $('Tag Pushed').first().json.ref_type }}"),
						rightValue: 'tag',
						operator: { type: 'string', operation: 'equals' },
					},
					{
						id: 'c2',
						leftValue: expr('{{ $json.merged_at }}'),
						rightValue: '',
						operator: { type: 'string', operation: 'notEmpty', singleValue: true },
					},
					{
						id: 'c3',
						leftValue: expr('{{ $json.merged_at }}'),
						rightValue: expr('{{ $now.minus({ days: 30 }).toISO() }}'),
						operator: { type: 'dateTime', operation: 'after' },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// Collects the merged pull requests into one list.
const collectAll = node({
	type: 'n8n-nodes-base.aggregate',
	version: 1,
	config: {
		name: 'Collect All',
		parameters: {
			aggregate: 'aggregateAllItemData',
			destinationFieldName: 'data',
			include: 'allFields',
		},
	},
});

// Builds the AI prompt fields from the tag event and the merged pull requests.
const preparePrompt = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Prompt',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'tag',
						value: expr("{{ $('Tag Pushed').first().json.ref }}"),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'repo',
						value: expr("{{ $('Tag Pushed').first().json.repository.full_name }}"),
						type: 'string',
					},
					{
						id: 'a3',
						name: 'changes',
						value: expr(
							'{{ $json.data.map(p => "- " + p.title + " (#" + p.number + ")").join("\\n") }}',
						),
						type: 'string',
					},
				],
			},
		},
	},
});

// [AI model] OpenAI. Swap for Anthropic, Google Gemini, Mistral or Ollama: replace this
// node only. It reads $json.tag, $json.repo and $json.changes. The next node reads
// $json.message.content.
const draftNotes = node({
	type: '@n8n/n8n-nodes-langchain.openAi',
	version: 1.8,
	config: {
		name: 'Draft Release Notes',
		credentials: { openAiApi: newCredential('OpenAI account') },
		parameters: {
			resource: 'text',
			operation: 'message',
			modelId: { __rl: true, mode: 'id', value: 'gpt-4o-mini' },
			messages: {
				values: [
					{
						role: 'system',
						content:
							'You write release notes for developers. Group the changes under Features, Fixes and Other. Keep the pull request numbers as links. Reply in Markdown, no preamble.',
					},
					{
						role: 'user',
						content: expr(
							'{{ "Release " + $json.tag + " for " + $json.repo + ".\\n\\nMerged pull requests:\\n" + $json.changes }}',
						),
					},
				],
			},
			simplify: true,
		},
		output: [
			{
				index: 0,
				message: {
					role: 'assistant',
					content:
						'## Fixes\n- Fix authentication bug ([#42](https://github.com/acme/api/pull/42))',
				},
				finish_reason: 'stop',
			},
		],
	},
});

// [code hosting] GitHub: opens the release as a draft for a human to review.
const createDraftRelease = node({
	type: 'n8n-nodes-base.github',
	version: 1.1,
	config: {
		name: 'Create Draft Release',
		credentials: { githubApi: newCredential('GitHub account') },
		parameters: {
			resource: 'release',
			operation: 'create',
			authentication: 'accessToken',
			owner: { __rl: true, mode: 'name', value: placeholder('GitHub owner (org or username)') },
			repository: { __rl: true, mode: 'name', value: placeholder('Repository name') },
			releaseTag: expr("{{ $('Prepare Prompt').first().json.tag }}"),
			additionalFields: {
				name: expr("{{ $('Prepare Prompt').first().json.tag }}"),
				body: expr('{{ $json.message.content }}'),
				draft: true,
			},
		},
	},
});

export default workflow('id', 'Release Notes Draft')
	.add(tagPushed)
	.to(getClosedPRs)
	.to(mergedSinceLastTag)
	.to(collectAll)
	.to(preparePrompt)
	.to(draftNotes)
	.to(createDraftRelease);
