// Use case: sales-and-marketing / AI Review of Support Interactions.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The Airtable base needs a Reviewed (checkbox), Sentiment (text) and Summary (text)
// column next to the Transcript column already used to log each interaction.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Runs every 2 hours.
const everyTwoHours = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every 2 Hours',
		parameters: {
			rule: {
				interval: [{ field: 'hours', hoursInterval: 2 }],
			},
		},
	},
});

// [spreadsheet] Tool. Swap for another spreadsheet: replace this node only. It runs on
// the trigger's schedule. The next node reads $json.id and $json.fields.Transcript.
const searchUnreviewed = node({
	type: 'n8n-nodes-base.airtable',
	version: 2.2,
	config: {
		name: 'Search Unreviewed',
		credentials: { airtableTokenApi: newCredential('Airtable account') },
		parameters: {
			authentication: 'airtableTokenApi',
			resource: 'record',
			operation: 'search',
			base: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable base ID, for example the Support base'),
			},
			table: {
				__rl: true,
				mode: 'id',
				value: placeholder(
					'Airtable table name for support interactions, for example Interactions',
				),
			},
			filterByFormula: 'NOT({Reviewed})',
		},
		output: [
			{
				id: 'recAcme0001',
				fields: {
					Transcript:
						'Customer asked about a refund for order #1042 and seemed frustrated with the delay.',
				},
			},
		],
	},
});

// [AI model] Tool. Swap for another AI model: replace this node only. It reads
// $json.fields.Transcript. The next node reads $json.message.content.sentiment and
// $json.message.content.summary.
const classifyInteraction = node({
	type: '@n8n/n8n-nodes-langchain.openAi',
	version: 1.8,
	config: {
		name: 'Classify Interaction',
		credentials: { openAiApi: newCredential('OpenAI account') },
		parameters: {
			resource: 'text',
			operation: 'message',
			modelId: {
				__rl: true,
				mode: 'id',
				value: placeholder('OpenAI model ID, for example gpt-4o-mini'),
			},
			messages: {
				values: [
					{
						role: 'user',
						content: expr(
							'{{ "Classify the sentiment of this support interaction as positive, neutral or negative, and write a one sentence summary. Respond with JSON only, with the keys sentiment and summary.\\n\\nTranscript:\\n" + $json.fields.Transcript }}',
						),
					},
				],
			},
			jsonOutput: true,
		},
		output: [
			{
				message: {
					content: {
						sentiment: 'negative',
						summary: 'Customer is frustrated about a delayed refund.',
					},
				},
			},
		],
	},
});

// Builds the Sentiment, Summary and Reviewed fields to write back to Airtable.
const prepareUpdate = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Update',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'id',
						value: expr("{{ $('Search Unreviewed').item.json.id }}"),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'Sentiment',
						value: expr('{{ $json.message.content.sentiment }}'),
						type: 'string',
					},
					{
						id: 'a3',
						name: 'Summary',
						value: expr('{{ $json.message.content.summary }}'),
						type: 'string',
					},
					{ id: 'a4', name: 'Reviewed', value: expr('{{ true }}'), type: 'boolean' },
				],
			},
		},
	},
});

// [spreadsheet] Tool. Swap for another spreadsheet: replace this node only. It reads
// $json.id, $json.Sentiment, $json.Summary and $json.Reviewed.
const updateRecord = node({
	type: 'n8n-nodes-base.airtable',
	version: 2.2,
	config: {
		name: 'Update Record',
		credentials: { airtableTokenApi: newCredential('Airtable account') },
		parameters: {
			authentication: 'airtableTokenApi',
			resource: 'record',
			operation: 'update',
			base: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable base ID, for example the Support base'),
			},
			table: {
				__rl: true,
				mode: 'id',
				value: placeholder(
					'Airtable table name for support interactions, for example Interactions',
				),
			},
			columns: {
				mappingMode: 'defineBelow',
				matchingColumns: ['id'],
				value: {
					id: expr('{{ $json.id }}'),
					Sentiment: expr('{{ $json.Sentiment }}'),
					Summary: expr('{{ $json.Summary }}'),
					Reviewed: expr('{{ $json.Reviewed }}'),
				},
				schema: [
					{
						id: 'id',
						displayName: 'id',
						required: false,
						defaultMatch: true,
						display: true,
						canBeUsedToMatch: true,
						type: 'string',
					},
					{
						id: 'Sentiment',
						displayName: 'Sentiment',
						required: false,
						defaultMatch: false,
						display: true,
						canBeUsedToMatch: true,
						type: 'string',
					},
					{
						id: 'Summary',
						displayName: 'Summary',
						required: false,
						defaultMatch: false,
						display: true,
						canBeUsedToMatch: true,
						type: 'string',
					},
					{
						id: 'Reviewed',
						displayName: 'Reviewed',
						required: false,
						defaultMatch: false,
						display: true,
						canBeUsedToMatch: true,
						type: 'boolean',
					},
				],
			},
		},
	},
});

export default workflow('id', 'AI Review of Support Interactions')
	.add(everyTwoHours)
	.to(searchUnreviewed)
	.to(classifyInteraction)
	.to(prepareUpdate)
	.to(updateRecord);
