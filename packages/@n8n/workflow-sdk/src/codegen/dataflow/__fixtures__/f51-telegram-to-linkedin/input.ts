workflow({ name: 'F51: Telegram to LinkedIn' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.telegramTrigger',
			params: { updates: ['message'], additionalFields: {} },
			credentials: { telegramApi: { id: 'credential-id', name: 'telegramApi Credential' } },
			version: 1.1,
		},
		(items) => {
			items.route((item) => item.json.message.voice.file_id, {
				'': (items) => {
					const download_File = executeNode({
						type: 'n8n-nodes-base.telegram',
						name: 'Download File',
						params: {
							fileId: item.json.message.voice.file_id,
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
						version: 2.1,
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
										content: `You are a LinkedIn post formatter. You receive the user's Telegram message: ${transcribe_Audio.json.text}  and transform it into a polished LinkedIn post.

STRUCTURE:
- Hook: Punchy opening line (max 9 words) on its own line.
- Body: 14-18 short paragraphs (2-3 lines each).
- Length: 1,242-2,500 characters total.
- End: Specific question or call-to-action.

FORMATTING:
- Plain text only. No markdown or special symbols.
- Use \n for single line breaks.
- Use \n\n between paragraphs.
- Add maximum 2 emojis total in the entire post.
- Use periods at the end of every sentence.
- Keep sentences 10-19 words.
- No em dashes or hyphens for breaks.

TONE:
- Write at grade 5-7 reading level (simple, clear words).
- Conversational and authentic. Sound like a real person.
- Use only the information provided in the user's Telegram message.
- No added humor or jokes.
- Avoid corporate buzzwords and fluffy language.
- Be direct and actionable.

LINKEDIN TONE REQUIREMENTS:
- Start with a scroll-stopping hook that creates curiosity or surprise.
- Write like you're talking to a colleague, not teaching a class.
- Use "I" statements and personal experiences when possible.
- Vary sentence length - mix short punchy lines with longer explanations.
- Show personality - opinions, observations, or lessons learned.
- Avoid generic statements like "Many believe" or "Some say."
- Make it conversational - how would you explain this over coffee?

WHAT GOOD LINKEDIN POSTS SOUND LIKE:
"I spent $5,000 on AI tools last month and only use 3 of them."
"Everyone talks about AI search but nobody mentions this one thing."
"My client asked if AI will replace SEO and I said no here's why."

AVOID:
- Hashtags.
- Generic motivational statements.
- Walls of text without breaks.
- External URLs.
- AI-sounding phrases.
- More than 2 emojis.
- Em dashes or hyphens as separators.
- Adding information not in the user's input.

OUTPUT:
Return only the formatted LinkedIn post as plain text. No JSON. No extra commentary.
`,
									},
								],
							},
						},
						credentials: { openAiApi: { id: 'credential-id', name: 'openAiApi Credential' } },
						version: 2.1,
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
										content: `You are an AI image prompt generator for LinkedIn posts. You receive a LinkedIn post text and create a professional image prompt for AI image generation.

YOUR TASK:
Analyze the LinkedIn post: ${linkedIn_Post_Text.json.message.content} and generate a single, detailed image prompt that visually represents the main concept.

IMAGE PROMPT REQUIREMENTS:

STYLE:
- Professional and clean business aesthetic.
- Suitable for LinkedIn professional audience.
- Modern, minimalist design with clear focal point.
- Avoid cluttered or overly complex compositions.

CONTENT:
- Focus on the main topic or concept from the post.
- Use metaphors or visual representations, not literal text.
- Include relevant business or tech elements when appropriate.
- Avoid faces, specific people, or identifiable individuals.
- No text overlays or words in the image.

TECHNICAL SPECS:
- Describe lighting, colors, and mood clearly.
- Specify composition (centered, rule of thirds, etc.).
- Mention perspective (front view, top down, close-up, etc.).
- Keep aspect ratio suitable for LinkedIn (square or landscape).

PROMPT STRUCTURE:
Write prompts in this format:
"[Main subject], [setting/background], [style],
`,
									},
								],
							},
						},
						credentials: { openAiApi: { id: 'credential-id', name: 'openAiApi Credential' } },
						version: 2.1,
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
						version: 2.1,
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
				},
				' ': (items) => {
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
										value: item.json.message.text,
									},
								],
							},
						},
						version: 3.4,
					});
				},
			});
		},
	);
});
