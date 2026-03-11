workflow({ name: 'Create LinkedIn Post from Telegram Voice or Text Message' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.telegramTrigger',
			params: { updates: ['message'], additionalFields: {} },
			credentials: { telegramApi: { id: 'credential-id', name: 'telegramApi Credential' } },
			version: 1.1,
		},
		(items) => {
			switch (items[0].json.message.voice.file_id) {
				case '': {
					const download_File = executeNode({
						type: 'n8n-nodes-base.telegram',
						name: 'Download File',
						params: {
							fileId: items.json.message.voice.file_id,
							resource: 'file',
							additionalFields: {},
						},
						credentials: { telegramApi: { id: 'credential-id', name: 'telegramApi Credential' } },
						version: 1.2,
					});
					const transcribe_Audio = executeNode({
						type: '@n8n/n8n-nodes-langchain.openAi',
						name: 'Transcribe Audio',
						params: { options: {}, resource: 'audio', operation: 'transcribe' },
						credentials: { openAiApi: { id: 'credential-id', name: 'openAiApi Credential' } },
						version: 1.6,
					});
					const linkedIn_Post_Text = executeNode({
						type: '@n8n/n8n-nodes-langchain.openAi',
						name: 'LinkedIn Post Text',
						params: {
							modelId: {
								__rl: true,
								mode: 'list',
								value: 'gpt-4.1-mini',
								cachedResultName: 'GPT-4.1-MINI',
							},
							options: {},
							messages: {
								values: [
									{
										content: expr(
											'You are a LinkedIn post formatter. You receive the user\'s Telegram message: {{ $json.text }}  and transform it into a polished LinkedIn post.\n\nSTRUCTURE:\n- Hook: Punchy opening line (max 9 words) on its own line.\n- Body: 14-18 short paragraphs (2-3 lines each).\n- Length: 1,242-2,500 characters total.\n- End: Specific question or call-to-action.\n\nFORMATTING:\n- Plain text only. No markdown or special symbols.\n- Use \\n for single line breaks.\n- Use \\n\\n between paragraphs.\n- Add maximum 2 emojis total in the entire post.\n- Use periods at the end of every sentence.\n- Keep sentences 10-19 words.\n- No em dashes or hyphens for breaks.\n\nTONE:\n- Write at grade 5-7 reading level (simple, clear words).\n- Conversational and authentic. Sound like a real person.\n- Use only the information provided in the user\'s Telegram message.\n- No added humor or jokes.\n- Avoid corporate buzzwords and fluffy language.\n- Be direct and actionable.\n\nLINKEDIN TONE REQUIREMENTS:\n- Start with a scroll-stopping hook that creates curiosity or surprise.\n- Write like you\'re talking to a colleague, not teaching a class.\n- Use "I" statements and personal experiences when possible.\n- Vary sentence length - mix short punchy lines with longer explanations.\n- Show personality - opinions, observations, or lessons learned.\n- Avoid generic statements like "Many believe" or "Some say."\n- Make it conversational - how would you explain this over coffee?\n\nWHAT GOOD LINKEDIN POSTS SOUND LIKE:\n"I spent $5,000 on AI tools last month and only use 3 of them."\n"Everyone talks about AI search but nobody mentions this one thing."\n"My client asked if AI will replace SEO and I said no here\'s why."\n\nAVOID:\n- Hashtags.\n- Generic motivational statements.\n- Walls of text without breaks.\n- External URLs.\n- AI-sounding phrases.\n- More than 2 emojis.\n- Em dashes or hyphens as separators.\n- Adding information not in the user\'s input.\n\nOUTPUT:\nReturn only the formatted LinkedIn post as plain text. No JSON. No extra commentary.\n',
										),
									},
								],
							},
						},
						credentials: { openAiApi: { id: 'credential-id', name: 'openAiApi Credential' } },
						version: 1.8,
					});
					const image_Prompt = executeNode({
						type: '@n8n/n8n-nodes-langchain.openAi',
						name: 'Image Prompt',
						params: {
							modelId: {
								__rl: true,
								mode: 'list',
								value: 'gpt-4.1-mini',
								cachedResultName: 'GPT-4.1-MINI',
							},
							options: {},
							messages: {
								values: [
									{
										content: expr(
											'You are an AI image prompt generator for LinkedIn posts. You receive a LinkedIn post text and create a professional image prompt for AI image generation.\n\nYOUR TASK:\nAnalyze the LinkedIn post: {{ $json.message.content }} and generate a single, detailed image prompt that visually represents the main concept.\n\nIMAGE PROMPT REQUIREMENTS:\n\nSTYLE:\n- Professional and clean business aesthetic.\n- Suitable for LinkedIn professional audience.\n- Modern, minimalist design with clear focal point.\n- Avoid cluttered or overly complex compositions.\n\nCONTENT:\n- Focus on the main topic or concept from the post.\n- Use metaphors or visual representations, not literal text.\n- Include relevant business or tech elements when appropriate.\n- Avoid faces, specific people, or identifiable individuals.\n- No text overlays or words in the image.\n\nTECHNICAL SPECS:\n- Describe lighting, colors, and mood clearly.\n- Specify composition (centered, rule of thirds, etc.).\n- Mention perspective (front view, top down, close-up, etc.).\n- Keep aspect ratio suitable for LinkedIn (square or landscape).\n\nPROMPT STRUCTURE:\nWrite prompts in this format:\n"[Main subject], [setting/background], [style], \n',
										),
									},
								],
							},
						},
						credentials: { openAiApi: { id: 'credential-id', name: 'openAiApi Credential' } },
						version: 1.8,
					});
					const create_Image = executeNode({
						type: '@n8n/n8n-nodes-langchain.openAi',
						name: 'Create Image',
						params: {
							model: 'gpt-image-1',
							prompt: image_Prompt.json.message.content,
							options: {},
							resource: 'image',
						},
						credentials: { openAiApi: { id: 'credential-id', name: 'openAiApi Credential' } },
						version: 1.8,
					});
					const create_a_post = executeNode({
						type: 'n8n-nodes-base.linkedIn',
						name: 'Create a post',
						params: {
							text: expr("{{ $('LinkedIn Post Text').item.json.message.content }}"),
							person: 'z1_S-ihZxl',
							additionalFields: {},
							shareMediaCategory: 'IMAGE',
						},
						credentials: {
							linkedInOAuth2Api: { id: 'credential-id', name: 'linkedInOAuth2Api Credential' },
						},
						version: 1,
					});
					break;
				}
				case '': {
					const set_Text = executeNode({
						type: 'n8n-nodes-base.set',
						name: "Set 'Text'",
						params: {
							options: {},
							assignments: {
								assignments: [
									{
										id: 'fe7ecc99-e1e8-4a5e-bdd6-6fce9757b234',
										name: 'text',
										type: 'string',
										value: items.json.message.text,
									},
								],
							},
						},
						version: 3.4,
					});
					break;
				}
			}
		},
	);
});
