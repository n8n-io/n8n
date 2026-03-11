workflow({ name: 'Email Summary Agent' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.scheduleTrigger',
			name: 'Daily 7AM Trigger',
			params: { rule: { interval: [{ triggerAtHour: 7 }] } },
			version: 1.2,
		},
		(items) => {
			const fetch_Emails_Past_24_Hours = items.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.gmail',
					name: 'Fetch Emails - Past 24 Hours',
					params: {
						filters: {
							q: expr(
								"{{ \n  (() => {\n    const yesterday = new Date();\n    yesterday.setDate(yesterday.getDate() - 1);\n    return `isb.quantana@quantana.in after:${yesterday.getFullYear()}/${(yesterday.getMonth() + 1).toString().padStart(2, '0')}/${yesterday.getDate().toString().padStart(2, '0')}`;\n  })()\n}}",
							),
						},
						operation: 'getAll',
						returnAll: true,
					},
					credentials: { gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' } },
					version: 2.1,
				}),
			);
			const organize_Email_Data_Morning = fetch_Emails_Past_24_Hours.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.aggregate',
					name: 'Organize Email Data - Morning',
					params: {
						include: 'specifiedFields',
						options: {},
						aggregate: 'aggregateAllItemData',
						fieldsToInclude: 'id, From, To, CC, snippet',
					},
					version: 1,
				}),
			);
			const summarize_Emails_with_OpenAI_Morning = organize_Email_Data_Morning.map((item) =>
				executeNode({
					type: '@n8n/n8n-nodes-langchain.openAi',
					name: 'Summarize Emails with OpenAI - Morning',
					params: {
						modelId: {
							__rl: true,
							mode: 'list',
							value: 'gpt-4o-mini',
							cachedResultName: 'GPT-4O-MINI',
						},
						options: {},
						messages: {
							values: [
								{
									content: expr(
										'Go through this email summary and identify all key details mentioned, any specific issues to look at, and action items.\nUse this format to output\n{\n  "summary_of_emails": [\n    "Point 1",\n    "Point 2",\n    "Point 3"\n  ],\n  "actions": [\n    {\n      "name": "Name 1",\n      "action": "Action 1"\n    },\n    {\n      "name": "Name 1",\n      "action": "Action 2"\n    },\n    {\n      "name": "Name 2",\n      "action": "Action 3"\n    }\n  ]\n}\n\nInput Data:\n\n {{ $json.data.toJsonString() }}\n\n',
									),
								},
							],
						},
						jsonOutput: true,
					},
					credentials: { openAiApi: { id: 'credential-id', name: 'openAiApi Credential' } },
					version: 2.1,
				}),
			);
			const send_Summary_Morning = summarize_Emails_with_OpenAI_Morning.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.gmail',
					name: 'Send Summary - Morning',
					params: {
						sendTo: 'user@example.com',
						message: expr(
							'<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Email Summary - isbonline@quantana.in</title>\n    <style>\n        body {\n            font-family: Arial, sans-serif;\n            margin: 0;\n            padding: 0;\n            background-color: #f9f9f9;\n            color: #333;\n            line-height: 1.6;\n        }\n        .email-container {\n            max-width: 600px;\n            margin: 20px auto;\n            background: #ffffff;\n            border: 1px solid #ddd;\n            border-radius: 10px;\n            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);\n        }\n        .email-header {\n            background-color: #0073e6;\n            color: #fff;\n            padding: 20px;\n            text-align: center;\n            border-top-left-radius: 10px;\n            border-top-right-radius: 10px;\n        }\n        .email-header h1 {\n            margin: 0;\n            font-size: 24px;\n        }\n        .email-content {\n            padding: 20px;\n        }\n        .section-title {\n            font-size: 20px;\n            color: #0073e6;\n            margin-bottom: 10px;\n        }\n        ul {\n            list-style: none;\n            padding: 0;\n        }\n        ul li {\n            margin: 10px 0;\n            padding: 10px;\n            background: #f4f4f4;\n            border-left: 4px solid #0073e6;\n            border-radius: 5px;\n        }\n        .action-item {\n            font-weight: bold;\n            margin: 5px 0;\n        }\n        .action-detail {\n            margin-left: 10px;\n        }\n        .email-footer {\n            background-color: #0073e6;\n            color: #fff;\n            text-align: center;\n            padding: 10px;\n            font-size: 14px;\n            border-bottom-left-radius: 10px;\n            border-bottom-right-radius: 10px;\n        }\n    </style>\n</head>\n<body>\n    <div class="email-container">\n        <div class="email-header">\n            <h1>Email Summary</h1>\n        </div>\n        <div class="email-content">\n            <div>\n                <h2 class="section-title">Summary of Emails:</h2>\n                <ul>\n                    {{ $json.message.content.summary_of_emails.map(email => `<li>${email}</li>`).join(\'\') }}\n                </ul>\n            </div>\n            <div>\n                <h2 class="section-title">Actions:</h2>\n                <ul>\n                    {{ $json.message.content.actions.map(action => `\n                        <li>\n                            <span class="action-item">${action.name}:</span>\n                            <span class="action-detail">${action.action}</span>\n                        </li>\n                    `).join(\'\') }}\n                </ul>\n            </div>\n        </div>\n        <div class="email-footer">\n            <p>Generated by Quantana ESAgent <br /> A Quantana AI Labs Initiative\n        </div>\n    </div>\n</body>\n</html>',
						),
						options: {
							ccList: 'user@example.com',
							appendAttribution: false,
							replyToSenderOnly: false,
						},
						subject: expr(
							"ESAgent - {{ new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }}-00:00 to {{ new Date(new Date().setDate(new Date().getDate())).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }}-07:00AM",
						),
					},
					credentials: { gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' } },
					version: 2.1,
				}),
			);
		},
	);
});
