const wf = workflow('', '')
	.add(
		node({
			type: 'n8n-nodes-base.telegramBot',
			version: 1,
			config: {
				parameters: {
					webhookUrl: '=https://api.telegram.org/bot{{$env.YOUR_TELEGRAM_BOT_TOKEN}}/getUpdates',
					pollInterval: 5,
					allowedUpdates: ['message'],
					onlyNewUpdates: true,
				},
				position: [250, 200],
				name: 'Telegram Bot (Webhook)',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.if',
			version: 1,
			config: {
				parameters: {
					conditions: [
						{
							value1: '={{$json.message.photo}}',
							value2: 'true',
							operation: 'isNotEmpty',
						},
					],
				},
				position: [450, 500],
				name: "Check 'Photo'",
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.telegramBot',
			version: 1,
			config: {
				parameters: {
					chatId: '={{$json.message.chat.id}}',
					fileId: '={{$json.message.photo[{$json.message.photo.length - 1}].file_id}}',
					operation: 'getFile',
				},
				position: [700, 500],
				name: 'Get Telegram Photo',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 1,
			config: {
				parameters: {
					url: 'https://api.ocr.space/parse/image',
					method: 'POST',
					options: {
						query: [
							{ name: 'apikey', value: '={{$env.YOUR_OCR_SPACE_API_KEY}}' },
							{ name: 'language', value: 'eng' },
							{ name: 'isOverlayRequired', value: 'true' },
						],
						bodyParameters: [{ name: 'file', value: '={{$binary.data}}' }],
						bodyContentType: 'formData',
					},
				},
				position: [950, 500],
				name: 'OCR.space Request',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.telegramBot',
			version: 1,
			config: {
				parameters: {
					text: 'OCR Text Found:\n\n*{{$json.ParsedResults[0].ParsedText}}*',
					chatId: '={{$json.message.chat.id}}',
					parseMode: 'HTML',
				},
				position: [1200, 500],
				name: 'Send Raw OCR Text',
			},
		}),
	);
