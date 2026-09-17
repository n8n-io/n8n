// Use case: sales-and-marketing / Calendar Events into Timesheets.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The Salesforce custom object stores one row per event, with fields for the project,
// the work date, the hours and a description, matched on an external ID field.
// A calendar event counts as billable when its color is "Blueberry" (color ID 9), and
// its title must equal the open project's name exactly, or the match fails.
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	merge,
} from '@n8n/workflow-sdk';

const BILLABLE_COLOR_ID = '9';

// Runs once a day at 06:00.
const dailyAtSix = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Daily at 06:00',
		parameters: {
			rule: {
				interval: [{ field: 'days', triggerAtHour: 6, triggerAtMinute: 0 }],
			},
		},
	},
});

// [calendar] Tool. Swap for another calendar: replace this node only. It runs on the
// trigger's schedule. The next nodes read $json.colorId, $json.summary, $json.start and $json.end.
const getYesterdaysEvents = node({
	type: 'n8n-nodes-base.googleCalendar',
	version: 1.3,
	config: {
		name: "Get Yesterday's Events",
		credentials: { googleCalendarOAuth2Api: newCredential('Google Calendar account') },
		parameters: {
			resource: 'event',
			operation: 'getAll',
			calendar: {
				__rl: true,
				mode: 'id',
				value: placeholder(
					"Google Calendar ID to read, for example the calendar owner's email address",
				),
			},
			returnAll: true,
			timeMin: expr('{{ $now.minus({ days: 1 }).startOf("day").toISO() }}'),
			timeMax: expr('{{ $now.minus({ days: 1 }).endOf("day").toISO() }}'),
		},
		output: [
			{
				id: 'evt_0001',
				summary: 'Acme Project Sync',
				colorId: '9',
				start: { dateTime: '2026-09-16T09:00:00-07:00' },
				end: { dateTime: '2026-09-16T10:00:00-07:00' },
			},
		],
	},
});

// Keeps only the events whose color marks billable time.
const billableEvents = node({
	type: 'n8n-nodes-base.filter',
	version: 2.2,
	config: {
		name: 'Billable Events',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.colorId }}'),
						rightValue: BILLABLE_COLOR_ID,
						operator: { type: 'string', operation: 'equals' },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// [CRM] Tool. Swap for another CRM: replace this node only. It runs on the trigger's
// schedule. The next node reads $json.Id and $json.Name.
const getOpenProjects = node({
	type: 'n8n-nodes-base.salesforce',
	version: 1.1,
	config: {
		name: 'Get Open Projects',
		credentials: { salesforceOAuth2Api: newCredential('Salesforce account') },
		executeOnce: true,
		parameters: {
			resource: 'search',
			operation: 'query',
			query: "SELECT Id, Name FROM Project__c WHERE Status__c = 'Open'",
		},
		output: [{ Id: '001000000000001', Name: 'Acme Project Sync' }],
	},
});

// Matches each billable event to the open project with the same name.
const matchProjects = merge({
	version: 3.2,
	config: {
		name: 'Match Projects',
		parameters: {
			mode: 'combine',
			combineBy: 'combineByFields',
			advanced: true,
			mergeByFields: { values: [{ field1: 'summary', field2: 'Name' }] },
			joinMode: 'keepMatches',
			options: {},
		},
	},
});

// Builds one timesheet entry per matched event.
const buildTimesheetEntry = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Build Timesheet Entry',
		parameters: {
			mode: 'manual',
			includeOtherFields: true,
			assignments: {
				assignments: [
					{ id: 'a1', name: 'project_id', value: expr('{{ $json.Id }}'), type: 'string' },
					{
						id: 'a2',
						name: 'work_date',
						value: expr('{{ DateTime.fromISO($json.start.dateTime).toFormat("yyyy-MM-dd") }}'),
						type: 'string',
					},
					{
						id: 'a3',
						name: 'hours',
						value: expr(
							'{{ DateTime.fromISO($json.end.dateTime).diff(DateTime.fromISO($json.start.dateTime), "hours").hours }}',
						),
						type: 'number',
					},
					{ id: 'a4', name: 'description', value: expr('{{ $json.summary }}'), type: 'string' },
				],
			},
		},
	},
});

// [CRM] Tool. Swap for another CRM: replace this node only. It reads $json.id,
// $json.project_id, $json.work_date, $json.hours and $json.description.
const upsertTimesheet = node({
	type: 'n8n-nodes-base.salesforce',
	version: 1.1,
	config: {
		name: 'Upsert Timesheet',
		credentials: { salesforceOAuth2Api: newCredential('Salesforce account') },
		parameters: {
			resource: 'customObject',
			operation: 'upsert',
			customObject: placeholder(
				'Salesforce custom object API name for timesheet entries, for example Timesheet_Entry__c',
			),
			externalId: placeholder(
				'External ID field API name that stores the source calendar event ID, for example Calendar_Event_Id__c',
			),
			externalIdValue: expr('{{ $json.id }}'),
			customFieldsUi: {
				customFieldsValues: [
					{
						fieldId: placeholder('Project lookup field API name, for example Project__c'),
						value: expr('{{ $json.project_id }}'),
					},
					{
						fieldId: placeholder('Work date field API name, for example Work_Date__c'),
						value: expr('{{ $json.work_date }}'),
					},
					{
						fieldId: placeholder('Hours field API name, for example Hours__c'),
						value: expr('{{ $json.hours }}'),
					},
					{
						fieldId: placeholder('Description field API name, for example Description__c'),
						value: expr('{{ $json.description }}'),
					},
				],
			},
		},
	},
});

export default workflow('id', 'Calendar Events into Timesheets')
	.add(dailyAtSix)
	.to(getYesterdaysEvents)
	.to(billableEvents)
	.to(matchProjects.input(0))
	.add(dailyAtSix)
	.to(getOpenProjects)
	.to(matchProjects.input(1))
	.add(matchProjects)
	.to(buildTimesheetEntry)
	.to(upsertTimesheet);
