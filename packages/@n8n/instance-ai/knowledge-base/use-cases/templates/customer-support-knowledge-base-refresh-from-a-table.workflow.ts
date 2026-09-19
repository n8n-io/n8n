// Use case: customer-support / Knowledge Base Refresh from a Table.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The table has the fields Title, Information and Notes. The knowledge base here is
// Voiceflow's table upload endpoint; change the URL and body for another assistant platform.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Runs every day at 06:00.
const dailyAt6 = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Daily at 06:00',
		parameters: {
			rule: {
				interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 6, triggerAtMinute: 0 }],
			},
		},
	},
});

// [database] Tool. Swap for another database: replace this node only. It returns one item
// per record. The next node reads $json.id and $json.fields.
const fetchRecords = node({
	type: 'n8n-nodes-base.airtable',
	version: 2.2,
	config: {
		name: 'Fetch Records',
		credentials: { airtableTokenApi: newCredential('Airtable account') },
		parameters: {
			authentication: 'airtableTokenApi',
			resource: 'record',
			operation: 'search',
			base: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable base ID, for example the Knowledge base'),
			},
			table: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable table ID of the General information table'),
			},
			filterByFormula: '',
			returnAll: true,
			options: {},
		},
		output: [
			{
				id: 'recAcme0001',
				createdTime: '2026-09-01T10:00:00.000Z',
				fields: {
					Title: 'Opening hours',
					Information: 'The store is open Monday to Saturday from 09:00 to 20:00.',
					Notes: 'Closed on public holidays.',
				},
			},
		],
	},
});

// Maps the record to the field names the knowledge base indexes.
const renameFields = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Rename Fields',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{ id: 'a1', name: 'recordId', value: expr('{{ $json.id }}'), type: 'string' },
					{ id: 'a2', name: 'title', value: expr('{{ $json.fields.Title }}'), type: 'string' },
					{
						id: 'a3',
						name: 'information',
						value: expr('{{ $json.fields.Information }}'),
						type: 'string',
					},
					{
						id: 'a4',
						name: 'notes',
						value: expr('{{ $json.fields.Notes ?? "" }}'),
						type: 'string',
					},
				],
			},
		},
	},
});

// Collects all records into one item. The next node reads $json.items.
const collectRecords = node({
	type: 'n8n-nodes-base.aggregate',
	version: 1,
	config: {
		name: 'Collect Records',
		parameters: {
			aggregate: 'aggregateAllItemData',
			destinationFieldName: 'items',
			include: 'allFields',
		},
	},
});

// Uploads the records as one table document and replaces the previous version.
const uploadToKnowledgeBase = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Upload to Knowledge Base',
		credentials: { httpTemplatedCustomAuth: newCredential('Voiceflow account') },
		parameters: {
			method: 'POST',
			url: 'https://api.voiceflow.com/v1/knowledge-base/docs/upload/table',
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
			sendQuery: true,
			specifyQuery: 'keypair',
			queryParameters: { parameters: [{ name: 'overwrite', value: 'true' }] },
			sendBody: true,
			specifyBody: 'json',
			jsonBody: expr(
				'{{ JSON.stringify({ data: { name: "general", schema: { searchableFields: ["title", "information", "notes"], metadataFields: ["recordId"] }, items: $json.items } }) }}',
			),
		},
	},
});

export default workflow('id', 'Knowledge Base Refresh from a Table')
	.add(dailyAt6)
	.to(fetchRecords)
	.to(renameFields)
	.to(collectRecords)
	.to(uploadToKnowledgeBase);
