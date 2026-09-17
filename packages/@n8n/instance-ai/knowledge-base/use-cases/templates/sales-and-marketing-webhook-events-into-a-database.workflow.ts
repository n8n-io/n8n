// Use case: sales-and-marketing / Webhook Events into a Database with a Follow-up Workflow.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// CREATE TABLE events (
//   id bigint generated always as identity primary key,
//   source text, event text, payload jsonb, created_at timestamptz default now()
// );
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	ifElse,
} from '@n8n/workflow-sdk';

// Starts the workflow when an external app posts a new event.
const incomingEvent = trigger({
	type: 'n8n-nodes-base.webhook',
	version: 2.1,
	config: {
		name: 'Incoming Event',
		parameters: {
			httpMethod: 'POST',
			path: 'incoming-events',
			responseMode: 'onReceived',
		},
		output: [
			{
				body: {
					source: 'example-app',
					event: 'order.created',
					payload: { orderId: 'ord_1001' },
				},
			},
		],
	},
});

// [database] Tool. Swap for another database: replace this node only. It reads
// $json.body.source, $json.body.event and $json.body.payload. The next node reads $json.source.
const createEventRow = node({
	type: 'n8n-nodes-base.supabase',
	version: 1,
	config: {
		name: 'Create Event Row',
		credentials: { supabaseApi: newCredential('Supabase account') },
		parameters: {
			resource: 'row',
			operation: 'create',
			tableId: placeholder('Supabase table name for incoming events, for example events'),
			dataToSend: 'defineBelow',
			fieldsUi: {
				fieldValues: [
					{ fieldId: 'source', fieldValue: expr('{{ $json.body.source }}') },
					{ fieldId: 'event', fieldValue: expr('{{ $json.body.event }}') },
					{ fieldId: 'payload', fieldValue: expr('{{ JSON.stringify($json.body.payload) }}') },
				],
			},
		},
		output: [
			{
				id: 1,
				source: 'example-app',
				event: 'order.created',
				payload: { orderId: 'ord_1001' },
				created_at: '2026-09-17T12:00:00.000Z',
			},
		],
	},
});

// [database] Tool. Swap for another database: replace this node only. It reads
// $json.source. The next node reads $input.all().length.
const getRecentEvents = node({
	type: 'n8n-nodes-base.supabase',
	version: 1,
	config: {
		name: 'Get Recent Events',
		credentials: { supabaseApi: newCredential('Supabase account') },
		executeOnce: true,
		alwaysOutputData: true,
		parameters: {
			resource: 'row',
			operation: 'getAll',
			tableId: placeholder('Supabase table name for incoming events, for example events'),
			filterType: 'manual',
			matchType: 'allFilters',
			filters: {
				conditions: [
					{
						keyName: 'created_at',
						condition: 'gt',
						keyValue: expr('{{ $now.minus({ minutes: 10 }).toISO() }}'),
					},
					{ keyName: 'source', condition: 'eq', keyValue: expr('{{ $json.source }}') },
				],
			},
		},
		output: [
			{
				id: 1,
				source: 'example-app',
				event: 'order.created',
				created_at: '2026-09-17T12:00:00.000Z',
			},
		],
	},
});

// True when this event is the only one from the same source in the last 10 minutes.
const isIdle = ifElse({
	version: 2.2,
	config: {
		name: 'Is Idle',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $input.all().length <= 1 }}'),
						rightValue: '',
						operator: { type: 'boolean', operation: 'true', singleValue: true },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// Starts the follow-up processing sub-workflow.
const runFollowUp = node({
	type: 'n8n-nodes-base.executeWorkflow',
	version: 1.3,
	config: {
		name: 'Run Follow-up',
		parameters: {
			mode: 'once',
			source: 'database',
			workflowId: {
				__rl: true,
				mode: 'id',
				value: placeholder('Workflow ID of the follow-up processing sub-workflow'),
			},
		},
	},
});

// Does nothing; a processing run is already active for this source.
const skipAlreadyProcessing = node({
	type: 'n8n-nodes-base.noOp',
	version: 1,
	config: {
		name: 'Skip, Already Processing',
		parameters: {},
	},
});

export default workflow('id', 'Webhook Events into a Database')
	.add(incomingEvent)
	.to(createEventRow)
	.to(getRecentEvents)
	.to(isIdle.onTrue(runFollowUp).onFalse(skipAlreadyProcessing));
