// Use case: engineering / Release notes draft.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// [code hosting] GitHub. Swap for GitLab or Bitbucket: replace this node and the two
// other code hosting nodes. The next nodes read $json.ref and $json.ref_type.
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

// Tool-neutral step: one item with tag and the list of merged changes.
// ponytail: 30-day window; use the previous release date if you tag less often.
const collectChanges = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Collect Changes',
		parameters: {
			mode: 'runOnceForAllItems',
			jsCode: `const event = $('Tag Pushed').first().json;
if (event.ref_type !== 'tag') {
  return [];
}
const since = $now.minus({ days: 30 });
const merged = $input.all()
  .map((item) => item.json)
  .filter((pr) => pr.merged_at && DateTime.fromISO(pr.merged_at) > since);
if (merged.length === 0) {
  return [];
}
const changes = merged.map((pr) => '- #' + pr.number + ' ' + pr.title + ' (@' + pr.user.login + ') ' + pr.html_url).join('\\n');
return [{ json: { tag: event.ref, repo: event.repository.full_name, changes } }];`,
		},
	},
});

// [AI model] OpenAI. Swap for Anthropic, Google Gemini, Mistral or Ollama: replace this
// node only. It reads $json.tag and $json.changes. The next node reads $json.message.content.
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
			releaseTag: expr("{{ $('Collect Changes').first().json.tag }}"),
			additionalFields: {
				name: expr("{{ $('Collect Changes').first().json.tag }}"),
				body: expr('{{ $json.message.content }}'),
				draft: true,
			},
		},
	},
});

export default workflow('id', 'Release Notes Draft')
	.add(tagPushed)
	.to(getClosedPRs)
	.to(collectChanges)
	.to(draftNotes)
	.to(createDraftRelease);
