workflow({ name: '📨 Send AI summaries of incoming emails from Gmail to Telegram' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.gmailTrigger',
			name: 'When a new email arrives',
			params: {
				simple: false,
				filters: {},
				options: {},
				pollTimes: { item: [{ mode: 'everyMinute' }] },
			},
			credentials: { gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' } },
			version: 1.2,
		},
		(items) => {
			const set_summary_language = items.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.set',
					name: 'Set summary language',
					params: {
						options: {},
						assignments: {
							assignments: [
								{
									id: '148dcae1-3b72-4c28-b143-18b4b9877295',
									name: 'summary_language',
									type: 'string',
									value: 'english',
								},
							],
						},
						includeOtherFields: true,
					},
					version: 3.4,
				}),
			);
			const prepare_fields_for_agent = set_summary_language.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.set',
					name: 'Prepare fields for agent',
					params: {
						options: {},
						assignments: {
							assignments: [
								{
									id: 'ffff425d-cd86-498a-9984-d4c97c082a7b',
									name: 'summary_language',
									type: 'string',
									value: item.json.summary_language,
								},
								{
									id: 'a6dc9f16-faa1-4d82-be3c-b80937563605',
									name: 'from',
									type: 'string',
									value: expr(
										"{{ $json.from?.text || $json.from?.value?.[0]?.address || 'Unknown sender' }}",
									),
								},
								{
									id: 'c4f8daff-77e0-453f-82c2-751a8d6b8061',
									name: 'subject',
									type: 'string',
									value: item.json.subject,
								},
								{
									id: '43c37703-1f05-4f20-9d6f-0f7c08be6462',
									name: 'message',
									type: 'string',
									value: expr("{{ $json.html || $json.text || 'No message content available' }}"),
								},
							],
						},
					},
					version: 3.4,
				}),
			);
			const summary_generation_agent = prepare_fields_for_agent.map((item) =>
				executeNode({
					type: '@n8n/n8n-nodes-langchain.agent',
					name: 'Summary generation agent',
					params: {
						text: expr(
							'Summarize the following email in this language: {{ $json.summary_language }}\n\nFrom: {{ $json.from }}\nSubject: {{ $json.subject }}\n\n{{ $json.message }}',
						),
						options: {
							systemMessage:
								"You summarize emails in a short, natural, and informal way. Use a casual tone, like you're talking to a friend. Always write in the language specified by the user. Include who sent the email, what it\u2019s about, the most relevant details (like purchase info, prices, discounts, dates, or refund conditions), and ignore anything redundant or overly formal. Avoid robotic language, lists, or instructions like \u201Ckeep this email.\u201D Just say what matters.",
						},
						promptType: 'define',
					},
					version: 3.1,
					subnodes: {
						model: languageModel({
							type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							params: { model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' }, options: {} },
							version: 1.3,
							name: 'OpenAI Model',
							credentials: { openAiApi: { id: 'credential-id', name: 'openAiApi Credential' } },
						}),
					},
				}),
			);
			const send_summary_to_Telegram = summary_generation_agent.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.telegram',
					name: 'Send summary to Telegram',
					params: {
						text: item.json.output,
						chatId: 'SAMPLE CHAT ID - CHANGE IT',
						additionalFields: { parse_mode: 'Markdown', appendAttribution: false },
					},
					credentials: { telegramApi: { id: 'credential-id', name: 'telegramApi Credential' } },
					version: 1.2,
				}),
			);
		},
	);
});
