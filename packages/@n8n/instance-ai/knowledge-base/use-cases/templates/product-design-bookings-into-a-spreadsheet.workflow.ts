// Use case: product-design / Member Bookings into a Spreadsheet.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Sheet columns: email, member_id, attended_a_class, booked_a_class.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

const schedule = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every Day at 7am',
		parameters: {
			rule: {
				interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 7, triggerAtMinute: 0 }],
			},
		},
	},
});

// [spreadsheet] Google Sheets. Swap for Microsoft Excel 365 or Airtable: replace this node
// and the update node below. The next node reads $json.member_id.
const readMembers = node({
	type: 'n8n-nodes-base.googleSheets',
	version: 4.7,
	config: {
		name: 'Read Members',
		credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
		parameters: {
			resource: 'sheet',
			operation: 'read',
			documentId: {
				__rl: true,
				mode: 'url',
				value: placeholder('Google Sheets URL of the members sheet'),
			},
			sheetName: {
				__rl: true,
				mode: 'name',
				value: placeholder('Sheet name, for example Members'),
			},
		},
		output: [
			{
				email: 'jane@example.com',
				member_id: 'M-1001',
				attended_a_class: 'no',
				booked_a_class: 'no',
			},
		],
	},
});

// Fetches the bookings of the member in $json.member_id from the booking system.
const fetchBookings = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Fetch Bookings',
		onError: 'continueRegularOutput',
		credentials: { httpTemplatedCustomAuth: newCredential('Booking system API') },
		parameters: {
			method: 'GET',
			url: placeholder(
				'Bookings endpoint of the booking system, for example https://api.example.com/bookings',
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
			sendQuery: true,
			queryParameters: {
				parameters: [{ name: 'member_id', value: expr('{{ $json.member_id }}') }],
			},
		},
		output: [
			{
				bookings: [{ id: 'b-1', starts_at: '2026-09-10T18:00:00.000Z', status: 'attended' }],
			},
		],
	},
});

// Pairs each member with their bookings (by the paired input item) and sets the
// attendance flags.
const flagAttendance = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Flag Attendance',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'email',
						value: expr("{{ $('Read Members').item.json.email }}"),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'attended_a_class',
						value: expr(
							'{{ ($json.bookings || []).some(b => b.status === "attended" && DateTime.fromISO(b.starts_at) < $now) }}',
						),
						type: 'boolean',
					},
					{
						id: 'a3',
						name: 'booked_a_class',
						value: expr(
							'{{ ($json.bookings || []).some(b => DateTime.fromISO(b.starts_at) >= $now) }}',
						),
						type: 'boolean',
					},
				],
			},
		},
	},
});

// [spreadsheet] Google Sheets: writes the attendance flags back to the row that matches
// email. It reads $json.email, $json.attended_a_class and $json.booked_a_class.
const updateMembers = node({
	type: 'n8n-nodes-base.googleSheets',
	version: 4.7,
	config: {
		name: 'Update Members',
		credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
		parameters: {
			resource: 'sheet',
			operation: 'update',
			documentId: {
				__rl: true,
				mode: 'url',
				value: placeholder('Google Sheets URL of the members sheet'),
			},
			sheetName: {
				__rl: true,
				mode: 'name',
				value: placeholder('Sheet name, for example Members'),
			},
			columns: {
				mappingMode: 'defineBelow',
				value: {
					email: expr('{{ $json.email }}'),
					attended_a_class: expr('{{ $json.attended_a_class }}'),
					booked_a_class: expr('{{ $json.booked_a_class }}'),
				},
				matchingColumns: ['email'],
				schema: [
					{
						id: 'email',
						displayName: 'email',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
						canBeUsedToMatch: true,
					},
					{
						id: 'attended_a_class',
						displayName: 'attended_a_class',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
						canBeUsedToMatch: false,
					},
					{
						id: 'booked_a_class',
						displayName: 'booked_a_class',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
						canBeUsedToMatch: false,
					},
				],
			},
		},
	},
});

export default workflow('id', 'Member Bookings into a Spreadsheet')
	.add(schedule)
	.to(readMembers)
	.to(fetchBookings)
	.to(flagAttendance)
	.to(updateMembers);
