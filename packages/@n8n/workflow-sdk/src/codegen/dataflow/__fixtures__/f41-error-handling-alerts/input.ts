workflow({ name: 'Error handling alerts with Google Sheets, Telegram and Gmail' }, () => {
	onTrigger({ type: 'n8n-nodes-base.errorTrigger', params: {}, version: 1 }, (items) => {});
	const log_error = items.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.googleSheets',
			name: 'Log error',
			params: {
				columns: {
					value: {
						URL: expr('{{ $json.execution.url }}'),
						Node: expr('{{ $json.execution.error.node.name }}'),
						STATUS: 'NEW',
						Workflow: expr('{{ $json.workflow.name }}'),
						Timestamp: expr("{{ $now.format('D hh:mm a') }}"),
						'Error Message': expr('{{ $json.execution.error.message }}'),
					},
					schema: [
						{
							id: 'Timestamp',
							type: 'string',
							display: true,
							required: false,
							displayName: 'Timestamp',
							defaultMatch: false,
							canBeUsedToMatch: true,
						},
						{
							id: 'Workflow',
							type: 'string',
							display: true,
							required: false,
							displayName: 'Workflow',
							defaultMatch: false,
							canBeUsedToMatch: true,
						},
						{
							id: 'URL',
							type: 'string',
							display: true,
							required: false,
							displayName: 'URL',
							defaultMatch: false,
							canBeUsedToMatch: true,
						},
						{
							id: 'Node',
							type: 'string',
							display: true,
							required: false,
							displayName: 'Node',
							defaultMatch: false,
							canBeUsedToMatch: true,
						},
						{
							id: 'Error Message',
							type: 'string',
							display: true,
							required: false,
							displayName: 'Error Message',
							defaultMatch: false,
							canBeUsedToMatch: true,
						},
						{
							id: 'STATUS',
							type: 'string',
							display: true,
							removed: false,
							required: false,
							displayName: 'STATUS',
							defaultMatch: false,
							canBeUsedToMatch: true,
						},
						{
							id: 'Notes',
							type: 'string',
							display: true,
							removed: false,
							required: false,
							displayName: 'Notes',
							defaultMatch: false,
							canBeUsedToMatch: true,
						},
					],
					mappingMode: 'defineBelow',
					matchingColumns: [],
					attemptToConvertTypes: false,
					convertFieldsToString: false,
				},
				options: {},
				operation: 'append',
				sheetName: {
					__rl: true,
					mode: 'list',
					value: 'gid=0',
					cachedResultUrl:
						'https://docs.google.com/spreadsheets/d/1KKolzBcFWGI_RtFUvT1bdufFpMdA0WfM9quvgg_cKlU/edit#gid=0',
					cachedResultName: 'Sheet1',
				},
				documentId: {
					__rl: true,
					mode: 'list',
					value: '1KKolzBcFWGI_RtFUvT1bdufFpMdA0WfM9quvgg_cKlU',
					cachedResultUrl:
						'https://docs.google.com/spreadsheets/d/1KKolzBcFWGI_RtFUvT1bdufFpMdA0WfM9quvgg_cKlU/edit?usp=drivesdk',
					cachedResultName: 'Error Logs',
				},
			},
			credentials: {
				googleSheetsOAuth2Api: { id: 'credential-id', name: 'googleSheetsOAuth2Api Credential' },
			},
			version: 4.5,
		}),
	);
	const edit_Fields = items.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.set',
			name: 'Edit Fields',
			params: {
				options: {},
				assignments: {
					assignments: [
						{
							id: '0e3ef75e-b4d9-489a-b45b-ca0b994756a7',
							name: 'telegramChatID',
							type: 'string',
							value: 'chatID',
						},
						{
							id: '6e354af6-dd5e-4200-99ef-7856129d782e',
							name: 'toEmail',
							type: 'string',
							value: 'toEmail',
						},
					],
				},
			},
			version: 3.4,
		}),
	);
	const notify_in_channel = edit_Fields.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.telegram',
			name: 'Notify in channel',
			params: {
				text: expr(
					"⚠️🐛 New bug in n8n\n\nWorkflow: {{ $('Error Trigger').item.json.workflow.name }}\nExecution URL: {{ $('Error Trigger').item.json.execution.url }}\nNode name: {{ $('Error Trigger').item.json.execution.error.node.name }}\nError message: {{ $('Error Trigger').item.json.execution.error.message }}",
				),
				chatId: item.json.telegramChatID,
				additionalFields: { appendAttribution: false },
			},
			credentials: { telegramApi: { id: 'credential-id', name: 'telegramApi Credential' } },
			version: 1.2,
		}),
	);
	const send_email = notify_in_channel.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.gmail',
			name: 'Send email',
			params: {
				sendTo: expr("{{ $('Edit Fields').item.json.toEmail }}"),
				message: item.json.result.text,
				options: { senderName: 'n8n Error Tracker', appendAttribution: false },
				subject: expr('🐛New n8n bug in "{{ $(\'Error Trigger\').item.json.workflow.name }}"'),
			},
			credentials: { gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' } },
			version: 2.1,
		}),
	);
});
