// Use case: engineering / Daily Lead Report from the CRM.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Every tool gets the report rows as text. Slack, Gmail and Outlook also get the CSV file;
// Teams has no file upload in n8n.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Runs every day at 17:00.
const dailyAt17 = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Daily at 17:00',
		parameters: {
			rule: {
				interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 17, triggerAtMinute: 0 }],
			},
		},
	},
});

// [CRM] Tool. Swap for another CRM: replace this node only. It returns the leads that the
// partner source created yesterday. Change the LeadSource value in the query to your source.
// The next node reads $json.CreatedDate, $json.Status, $json.Email and $json.State.
const getLeadsFromYesterday = node({
	type: 'n8n-nodes-base.salesforce',
	version: 1.1,
	config: {
		name: 'Get Leads from Yesterday',
		credentials: { salesforceOAuth2Api: newCredential('Salesforce account') },
		parameters: {
			resource: 'search',
			operation: 'query',
			query:
				"SELECT Id, CreatedDate, Status, Email, State FROM Lead WHERE LeadSource = 'Partner' AND CreatedDate = YESTERDAY",
		},
		output: [
			{
				Id: '00Q000000000001',
				CreatedDate: '2026-09-17T09:12:00.000+0000',
				Status: 'Open - Not Contacted',
				Email: 'jane@example.com',
				State: 'CA',
			},
		],
	},
});

// Keeps the report columns, one item per lead. Leads to CSV writes every field as a column.
const reportFields = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Report Fields',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'Created',
						value: expr('{{ $json.CreatedDate.slice(0, 10) }}'),
						type: 'string',
					},
					{ id: 'a2', name: 'Status', value: expr('{{ $json.Status }}'), type: 'string' },
					{ id: 'a3', name: 'Email', value: expr('{{ $json.Email }}'), type: 'string' },
					{ id: 'a4', name: 'State', value: expr('{{ $json.State }}'), type: 'string' },
				],
			},
		},
		output: [
			{
				Created: '2026-09-17',
				Status: 'Open - Not Contacted',
				Email: 'jane@example.com',
				State: 'CA',
			},
		],
	},
});

// Writes all leads into one CSV file in the binary field data.
const leadsToCsv = node({
	type: 'n8n-nodes-base.convertToFile',
	version: 1.1,
	config: {
		name: 'Leads to CSV',
		parameters: {
			operation: 'csv',
			binaryPropertyName: 'data',
			options: {
				fileName: expr(
					'{{ "partner-leads-" + $now.minus(1, "days").toFormat("yyyy-MM-dd") + ".csv" }}',
				),
				headerRow: true,
			},
		},
	},
});

// Builds the report text and keeps the CSV file. The notification node reads $json.subject,
// $json.message and the binary field data.
const prepareReport = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Report',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'subject',
						value: expr(
							'{{ "Partner lead report for " + $now.minus(1, "days").toFormat("yyyy-MM-dd") }}',
						),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'message',
						value: expr(
							'{{ $("Report Fields").all().length + " new partner leads.\\n\\nCreated | Status | Email | State\\n" + $("Report Fields").all().map(i => [i.json.Created, i.json.Status, i.json.Email, i.json.State].join(" | ")).join("\\n") }}',
						),
						type: 'string',
					},
				],
			},
			options: { includeBinary: true },
		},
		output: [
			{
				subject: 'Partner lead report for 2026-09-17',
				message:
					'1 new partner leads.\n\nCreated | Status | Email | State\n2026-09-17 | Open - Not Contacted | jane@example.com | CA',
			},
		],
	},
});

// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
const NOTIFY = 'gmail';

// One ready node per tool. Each reads $json.subject and $json.message; Slack, Gmail and
// Outlook also attach the binary field data.
const sinks = {
	slack: {
		type: 'n8n-nodes-base.slack',
		version: 2.7,
		config: {
			name: 'Send Report',
			credentials: { slackOAuth2Api: newCredential('Slack account') },
			parameters: {
				resource: 'file',
				operation: 'upload',
				authentication: 'oAuth2',
				binaryData: true,
				binaryPropertyName: 'data',
				options: {
					channelId: placeholder('Slack channel ID, for example C0123456789'),
					initialComment: expr('{{ $json.subject + "\\n" + $json.message }}'),
				},
			},
		},
	},
	teams: {
		type: 'n8n-nodes-base.microsoftTeams',
		version: 2,
		config: {
			name: 'Send Report',
			credentials: { microsoftTeamsOAuth2Api: newCredential('Microsoft Teams account') },
			parameters: {
				resource: 'channelMessage',
				operation: 'create',
				teamId: {
					__rl: true,
					mode: 'id',
					value: placeholder('Team ID, the groupId in the team link'),
				},
				channelId: {
					__rl: true,
					mode: 'id',
					value: placeholder('Channel ID, the 19:...@thread.tacv2 part of the channel link'),
				},
				contentType: 'text',
				message: expr('{{ $json.subject + "\\n" + $json.message }}'),
			},
		},
	},
	gmail: {
		type: 'n8n-nodes-base.gmail',
		version: 2.2,
		config: {
			name: 'Send Report',
			credentials: { gmailOAuth2: newCredential('Gmail account') },
			parameters: {
				resource: 'message',
				operation: 'send',
				authentication: 'oAuth2',
				sendTo: placeholder('Report recipients, for example partners@example.com'),
				subject: expr('{{ $json.subject }}'),
				emailType: 'text',
				message: expr('{{ $json.message }}'),
				options: {
					appendAttribution: false,
					attachmentsUi: { attachmentsBinary: [{ property: 'data' }] },
				},
			},
		},
	},
	outlook: {
		type: 'n8n-nodes-base.microsoftOutlook',
		version: 2,
		config: {
			name: 'Send Report',
			credentials: { microsoftOutlookOAuth2Api: newCredential('Microsoft Outlook account') },
			parameters: {
				authentication: 'microsoftOutlookOAuth2Api',
				resource: 'message',
				operation: 'send',
				toRecipients: placeholder('Report recipients, for example partners@example.com'),
				subject: expr('{{ $json.subject }}'),
				bodyContent: expr('{{ $json.message }}'),
				additionalFields: {
					bodyContentType: 'Text',
					attachments: { attachments: [{ binaryPropertyName: 'data' }] },
				},
			},
		},
	},
};
const sendReport = node(sinks[NOTIFY]);

export default workflow('id', 'Daily Lead Report from the CRM')
	.add(dailyAt17)
	.to(getLeadsFromYesterday)
	.to(reportFields)
	.to(leadsToCsv)
	.to(prepareReport)
	.to(sendReport);
