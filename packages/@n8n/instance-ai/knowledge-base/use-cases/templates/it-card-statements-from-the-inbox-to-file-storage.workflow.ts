// Use case: it / Card Statements from the Inbox to File Storage.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Give the statement mails one label in Gmail, for example "card-statements".
// ponytail: a mail without an attachment is only marked as read; add an HTML to PDF step
// on the false branch when the card issuer sends statements as mail bodies.
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	ifElse,
} from '@n8n/workflow-sdk';

// Runs every hour.
const everyHour = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every Hour',
		parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } },
	},
});

// [email] Tool. Swap for another mailbox: replace this node only. It returns one item per unread
// labeled mail, with the attachments as binary fields attachment_0, attachment_1, ...
const readStatementMail = node({
	type: 'n8n-nodes-base.gmail',
	version: 2.1,
	config: {
		name: 'Read Statement Mail',
		credentials: { gmailOAuth2: newCredential('Gmail account') },
		parameters: {
			resource: 'message',
			operation: 'getAll',
			authentication: 'oAuth2',
			returnAll: false,
			limit: 20,
			simple: false,
			filters: {
				labelIds: [placeholder('Gmail label ID of the statement label, for example Label_123')],
				readStatus: 'unread',
			},
			options: { downloadAttachments: true },
		},
		output: [
			{
				id: '18f1a2b3c4d5e6f7',
				threadId: '18f1a2b3c4d5e6f7',
				labelIds: ['UNREAD', 'Label_123'],
				subject: 'Your card statement for August',
				date: '2026-09-02T06:15:00.000Z',
				from: {
					value: [{ address: 'statements@card.example.com', name: 'Card Issuer' }],
					text: 'Card Issuer <statements@card.example.com>',
				},
			},
		],
	},
});

// True when the mail carries at least one attachment.
const hasAttachment = ifElse({
	version: 2.2,
	config: {
		name: 'Has Attachment',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ Object.keys($binary || {}).length }}'),
						rightValue: 0,
						operator: { type: 'number', operation: 'gt' },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// [file storage] Tool. Swap for another file storage tool: replace this node only. It uploads
// the first attachment, named after the sender, the date and the file name.
const uploadStatement = node({
	type: 'n8n-nodes-base.googleDrive',
	version: 3,
	config: {
		name: 'Upload Statement',
		credentials: { googleDriveOAuth2Api: newCredential('Google Drive account') },
		parameters: {
			resource: 'file',
			operation: 'upload',
			authentication: 'oAuth2',
			inputDataFieldName: 'attachment_0',
			name: expr(
				"{{ $json.from.value[0].address + ' - ' + $json.date + ' - ' + $binary.attachment_0.fileName }}",
			),
			driveId: { __rl: true, mode: 'list', value: 'My Drive' },
			folderId: {
				__rl: true,
				mode: 'url',
				value: placeholder('Google Drive folder URL for the statements'),
			},
			options: {},
		},
	},
});

// [email] Tool. Swap for another mailbox: replace this node only. It marks the mail that started
// the run as read, so the next run skips it.
const markAsRead = node({
	type: 'n8n-nodes-base.gmail',
	version: 2.1,
	config: {
		name: 'Mark as Read',
		credentials: { gmailOAuth2: newCredential('Gmail account') },
		parameters: {
			resource: 'message',
			operation: 'markAsRead',
			authentication: 'oAuth2',
			messageId: expr("{{ $('Read Statement Mail').item.json.id }}"),
		},
	},
});

export default workflow('id', 'Card Statements from the Inbox to File Storage')
	.add(everyHour)
	.to(readStatementMail)
	.to(hasAttachment.onTrue(uploadStatement).onFalse(markAsRead))
	.add(uploadStatement)
	.to(markAsRead);
