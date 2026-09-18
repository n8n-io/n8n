// Use case: it / Tasks from Labeled Mail into a Docs Database.
// Email inbox: set INBOX to gmail or outlook. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Gmail: give task mails the label "newtask". Outlook: give them the category "New task".
// The Notion database has the title property and a rich text property "Description".
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	languageModel,
	outputParser,
} from '@n8n/workflow-sdk';

// Runs every 30 minutes.
const everyHalfHour = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every Half Hour',
		parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 30 }] } },
	},
});

// Email inbox: set INBOX to gmail or outlook. Nothing else changes.
const INBOX = 'gmail';

// One ready reader per tool. Each returns one item per unread task mail.
const inboxReaders = {
	gmail: {
		type: 'n8n-nodes-base.gmail',
		version: 2.1,
		config: {
			name: 'Read Task Mail',
			credentials: { gmailOAuth2: newCredential('Gmail account') },
			parameters: {
				resource: 'message',
				operation: 'getAll',
				authentication: 'oAuth2',
				returnAll: false,
				limit: 20,
				simple: true,
				filters: { q: 'label:newtask', readStatus: 'unread' },
			},
			output: [
				{
					id: '18f1a2b3c4d5e6f7',
					threadId: '18f1a2b3c4d5e6f7',
					snippet: 'Can you update the Jira board with the new sprint dates before Friday?',
					From: 'Jane Doe <jane@example.com>',
					Subject: 'Sprint dates',
					labels: [{ id: 'UNREAD', name: 'UNREAD' }],
				},
			],
		},
	},
	outlook: {
		type: 'n8n-nodes-base.microsoftOutlook',
		version: 2,
		config: {
			name: 'Read Task Mail',
			credentials: { microsoftOutlookOAuth2Api: newCredential('Microsoft Outlook account') },
			parameters: {
				authentication: 'microsoftOutlookOAuth2Api',
				resource: 'message',
				operation: 'getAll',
				returnAll: false,
				limit: 20,
				output: 'simple',
				filtersUI: {
					values: {
						filterBy: 'filters',
						filters: { readStatus: 'unread', custom: "categories/any(c:c eq 'New task')" },
					},
				},
			},
			output: [
				{
					id: 'AAMkAGI2THVSAAA=',
					subject: 'Sprint dates',
					bodyPreview: 'Can you update the Jira board with the new sprint dates before Friday?',
					from: { emailAddress: { name: 'Jane Doe', address: 'jane@example.com' } },
					isRead: false,
				},
			],
		},
	},
};
const readTaskMail = node(inboxReaders[INBOX]);

// The field names of each tool.
const fields = {
	gmail: { subject: '$json.Subject', body: '$json.snippet' },
	outlook: { subject: '$json.subject', body: '$json.bodyPreview' },
};
const field = fields[INBOX];

// One shape for the next nodes: id, subject and body.
const prepareMail = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Mail',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{ id: 'a1', name: 'id', value: expr('{{ $json.id }}'), type: 'string' },
					{ id: 'a2', name: 'subject', value: expr(`{{ ${field.subject} }}`), type: 'string' },
					{ id: 'a3', name: 'body', value: expr(`{{ ${field.body} }}`), type: 'string' },
				],
			},
		},
	},
});

// [AI model] Tool. Swap for another AI model: replace the model subnode only. It turns the mail
// into a task. The next node reads $json.output.title and $json.output.description.
const extractTask = node({
	type: '@n8n/n8n-nodes-langchain.chainLlm',
	version: 1.7,
	config: {
		name: 'Extract Task',
		parameters: {
			promptType: 'define',
			text: expr('{{ "Subject: " + $json.subject + "\\n\\nBody: " + $json.body }}'),
			hasOutputParser: true,
			messages: {
				messageValues: [
					{
						type: 'SystemMessagePromptTemplate',
						message:
							'The mail holds a new task for the reader. Write the key to-do as a task board card title of at most 5 words. Start the title with the tool involved and a dash when the mail names one, for example "Jira - update sprint dates". Add a one-sentence description with the details and the deadline when given.',
					},
				],
			},
		},
		subnodes: {
			model: languageModel({
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				version: 1.2,
				config: {
					name: 'OpenAI Chat Model',
					credentials: { openAiApi: newCredential('OpenAI account') },
					parameters: { model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' }, options: {} },
				},
			}),
			outputParser: outputParser({
				type: '@n8n/n8n-nodes-langchain.outputParserStructured',
				version: 1.3,
				config: {
					name: 'Task Parser',
					parameters: {
						schemaType: 'fromJson',
						jsonSchemaExample:
							'{ "title": "Jira - update sprint dates", "description": "Update the Jira board with the new sprint dates before Friday." }',
					},
				},
			}),
		},
		output: [
			{
				output: {
					title: 'Jira - update sprint dates',
					description: 'Update the Jira board with the new sprint dates before Friday.',
				},
			},
		],
	},
});

// [docs] Tool. Swap for another docs tool: replace this node only. It reads $json.output.title
// and $json.output.description.
const createTask = node({
	type: 'n8n-nodes-base.notion',
	version: 2.2,
	config: {
		name: 'Create Task',
		credentials: { notionApi: newCredential('Notion account') },
		parameters: {
			resource: 'databasePage',
			operation: 'create',
			authentication: 'apiKey',
			databaseId: {
				__rl: true,
				mode: 'url',
				value: placeholder('Notion URL of the tasks database'),
			},
			title: expr('{{ $json.output.title }}'),
			simple: true,
			propertiesUi: {
				propertyValues: [
					{
						key: 'Description|rich_text',
						richText: false,
						textContent: expr('{{ $json.output.description }}'),
					},
				],
			},
		},
	},
});

// One ready node per tool. Each marks the mail that started the run as read.
const processedMarkers = {
	gmail: {
		type: 'n8n-nodes-base.gmail',
		version: 2.1,
		config: {
			name: 'Mark as Read',
			credentials: { gmailOAuth2: newCredential('Gmail account') },
			parameters: {
				resource: 'message',
				operation: 'markAsRead',
				authentication: 'oAuth2',
				messageId: expr("{{ $('Prepare Mail').item.json.id }}"),
			},
		},
	},
	outlook: {
		type: 'n8n-nodes-base.microsoftOutlook',
		version: 2,
		config: {
			name: 'Mark as Read',
			credentials: { microsoftOutlookOAuth2Api: newCredential('Microsoft Outlook account') },
			parameters: {
				authentication: 'microsoftOutlookOAuth2Api',
				resource: 'message',
				operation: 'update',
				messageId: { __rl: true, mode: 'id', value: expr("{{ $('Prepare Mail').item.json.id }}") },
				updateFields: { isRead: true },
			},
		},
	},
};
const markProcessed = node(processedMarkers[INBOX]);

export default workflow('id', 'Tasks from Labeled Mail into a Docs Database')
	.add(everyHalfHour)
	.to(readTaskMail)
	.to(prepareMail)
	.to(extractTask)
	.to(createTask)
	.to(markProcessed);
