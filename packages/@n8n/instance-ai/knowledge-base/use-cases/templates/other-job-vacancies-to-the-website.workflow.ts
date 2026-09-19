// Use case: other / Job Vacancies to the Careers Website.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// HR system API: GET vacancies returns one item per vacancy with id, title, description.
// Website CMS API: GET posts returns one item per post with post_id, post_title,
// external_id; POST upsert accepts external_id, title, description, post_id.
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	merge,
	expr,
} from '@n8n/workflow-sdk';

const schedule = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every Hour',
		parameters: {
			rule: {
				interval: [{ field: 'hours', hoursInterval: 1 }],
			},
		},
	},
});

// Gets the open vacancies from the HR system. One item per vacancy.
const getVacancies = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Get Vacancies',
		credentials: { httpTemplatedCustomAuth: newCredential('HR system API') },
		parameters: {
			method: 'GET',
			url: placeholder(
				'Vacancies endpoint of the HR system, for example https://hr.example.com/api/vacancies',
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
		},
		output: [
			{
				id: 'VAC-101',
				title: 'Support Engineer',
				description: 'Help customers get the most out of the product.',
			},
		],
	},
});

// Gets the current job posts from the website CMS. One item per post.
const getWebsitePosts = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Get Website Posts',
		credentials: { httpTemplatedCustomAuth: newCredential('Website CMS API') },
		parameters: {
			method: 'GET',
			url: placeholder(
				'Job posts endpoint of the website CMS, for example https://cms.example.com/api/jobs',
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
		},
		output: [
			{
				post_id: 'POST-9',
				post_title: 'Support Engineer (old)',
				external_id: 'VAC-088',
			},
		],
	},
});

// Joins each vacancy with its matching website post by id / external_id.
const matchPosts = merge({
	version: 3.2,
	config: {
		name: 'Match Posts',
		parameters: {
			mode: 'combine',
			combineBy: 'combineByFields',
			advanced: true,
			mergeByFields: { values: [{ field1: 'id', field2: 'external_id' }] },
			joinMode: 'enrichInput1',
			options: {},
		},
	},
});

// Keeps vacancies with no post yet, or whose post title no longer matches the vacancy title.
const changedVacancies = node({
	type: 'n8n-nodes-base.filter',
	version: 2.2,
	config: {
		name: 'Changed Vacancies',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ !$json.post_id || $json.post_title !== $json.title }}'),
						rightValue: '',
						operator: { type: 'boolean', operation: 'true', singleValue: true },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// Builds the upsert payload: external_id, title, description, and the existing post_id if any.
const preparePayload = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Payload',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{ id: 'a1', name: 'external_id', value: expr('{{ $json.id }}'), type: 'string' },
					{ id: 'a2', name: 'title', value: expr('{{ $json.title }}'), type: 'string' },
					{ id: 'a3', name: 'description', value: expr('{{ $json.description }}'), type: 'string' },
					{ id: 'a4', name: 'post_id', value: expr('{{ $json.post_id || "" }}'), type: 'string' },
				],
			},
		},
	},
});

// Creates or updates the website post for each changed vacancy.
const upsertPost = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Upsert Post',
		credentials: { httpTemplatedCustomAuth: newCredential('Website CMS API') },
		parameters: {
			method: 'POST',
			url: placeholder(
				'Job post upsert endpoint of the CMS, for example https://cms.example.com/api/jobs/upsert',
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
			sendBody: true,
			specifyBody: 'json',
			jsonBody: expr('{{ JSON.stringify($json) }}'),
		},
	},
});

export default workflow('id', 'Job Vacancies to the Careers Website')
	.add(schedule)
	.to(getVacancies)
	.to(matchPosts.input(0))
	.add(schedule)
	.to(getWebsitePosts)
	.to(matchPosts.input(1))
	.add(matchPosts)
	.to(changedVacancies)
	.to(preparePayload)
	.to(upsertPost);
