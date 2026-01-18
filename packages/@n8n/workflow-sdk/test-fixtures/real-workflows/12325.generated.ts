const wf = workflow(
	'IgeWI32LKSmgs8Qj',
	'Create & track LinkedIn posts with Google Sheets, GPT-5.1, Unsplash, and Sona',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: { rule: { interval: [{}] } },
				position: [-224, 240],
				name: 'Schedule Trigger',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					options: {},
					filtersUI: { values: [{ lookupValue: 'Ready', lookupColumn: 'Status' }] },
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1500824165,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1qUir1c-_ScMnoYVoQ0W41nsv5IpLW6rjK8HUNqvNnAg/edit#gid=1500824165',
						cachedResultName: 'Automate LinkedIn Social Media Content Creation with AI - Gsheet',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1qUir1c-_ScMnoYVoQ0W41nsv5IpLW6rjK8HUNqvNnAg',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1qUir1c-_ScMnoYVoQ0W41nsv5IpLW6rjK8HUNqvNnAg/edit?usp=drivesdk',
						cachedResultName: 'example',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: { id: 'oURwy13SlM7ZHMDw', name: 'Dummy' },
				},
				position: [-48, 240],
				name: 'Get Post Idea',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.limit',
			version: 1,
			config: { position: [128, 240], name: 'Limit to One Post' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					columns: {
						value: {
							Status: '=In Progress',
							row_number: '={{ $json.row_number }}',
						},
						schema: [
							{
								id: 'Topic/Subject',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Topic/Subject',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Content Type',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Content Type',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Tone',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Tone',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Target Audience',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Target Audience',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Additional Notes',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Additional Notes',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Image link for your post',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Image link for your post',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'row_number',
								type: 'number',
								display: true,
								removed: false,
								readOnly: true,
								required: false,
								displayName: 'row_number',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['row_number'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'update',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1500824165,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1qUir1c-_ScMnoYVoQ0W41nsv5IpLW6rjK8HUNqvNnAg/edit#gid=1500824165',
						cachedResultName: 'Automate LinkedIn Social Media Content Creation with AI - Gsheet',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1qUir1c-_ScMnoYVoQ0W41nsv5IpLW6rjK8HUNqvNnAg',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1qUir1c-_ScMnoYVoQ0W41nsv5IpLW6rjK8HUNqvNnAg/edit?usp=drivesdk',
						cachedResultName: 'example',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: { id: 'oURwy13SlM7ZHMDw', name: 'Dummy' },
				},
				position: [320, 240],
				name: 'Update Post Status',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.1,
			config: {
				parameters: {
					text: '=You are a LinkedIn content expert. Create an engaging LinkedIn post based on these inputs:\n\nTopic: {{ $(\'Limit to One Post\').item.json[\'Topic/Subject\'] }}\nContent Type: {{ $(\'Limit to One Post\').item.json[\'Content Type\'] }}\nTone: {{ $(\'Limit to One Post\').item.json[\'Tone\'] }}\nTarget Audience: {{ $(\'Limit to One Post\').item.json[\'Target Audience\'] }}\nAdditional Notes: {{ $(\'Limit to One Post\').item.json[\'Additional Notes\'] }}\n\nRequirements:\n- Write a compelling LinkedIn post (150–300 words optimal)\n- Use short paragraphs (2–3 lines max) for readability\n- Include a strong hook in the first line\n- Add 3–5 relevant hashtags\n- Include a clear call-to-action that encourages comments\n- Match the specified tone exactly\n- Format specifically for LinkedIn (line breaks, no markdown)\n- Write in a natural, conversational human voice\n- Avoid corporate jargon, buzzwords, and overly formal language\n- Use contractions (I\'m, don\'t, we\'re) and casual phrasing where appropriate\n- Vary sentence length; avoid repetitive sentence structures\n- Include light personal perspective or storytelling when relevant\n- Avoid clichés such as "game-changer," "leverage," "synergy," "circle back," or "deep dive"\n- Do not use the character "—" anywhere\n- Write one word image queries separated by commas. \n\nOutput Instructions:\nReturn your response as valid JSON in the following structure only:\n\n{\n  "post_content": "The full LinkedIn post text goes here...",\n  "hashtags": ["#Marketing", "#Leadership", "#AI"],\n  "character_count": 285,\n  "engagement_tip": "Best time to post: Tuesday–Thursday, 8–10 AM",\n  "call_to_action": "What\'s your experience with this? Share in the comments.",\n  "image_query": "AI, Computer, IT"\n}\n',
					options: {},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [560, 176],
				name: 'AI Content Generation',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"// Parse the AI output\n// If your AI returns an array like in your example, we need to access the first item\nlet aiData;\n\ntry {\n  // Check if the input is already an object or needs parsing\n  if (typeof $input.all()[0].json.output === 'string') {\n    aiData = JSON.parse($input.all()[0].json.output);\n  } else {\n    // If it's already an object, use it directly\n    aiData = $input.all()[0].json.output;\n  }\n} catch (error) {\n  throw new Error('Failed to parse AI output: ' + error.message);\n}\n\n// Extract the components\nconst postContent = aiData.post_content || '';\nconst hashtags = aiData.hashtags || [];\nconst engagementTip = aiData.engagement_tip || '';\nconst callToAction = aiData.call_to_action || '';\nconst emojiSuggestions = aiData.emoji_suggestions || '';\n\n// Format hashtags as a single string\nconst hashtagString = hashtags.join(' ');\n\n// Create the final formatted post\n// Post content + blank line + hashtags\nconst finalPost = `${postContent}\\n\\n${hashtagString}`;\n\n// Calculate character count\nconst characterCount = finalPost.length;\n\n// Calculate word count (bonus metric)\nconst wordCount = finalPost.trim().split(/\\s+/).length;\n\n// Check if post is within LinkedIn limits\nconst isWithinLimit = characterCount <= 3000;\nconst hasHashtags = hashtags.length >= 3;\n\n// Return formatted output\nreturn {\n  // The final post ready to publish\n  final_post: finalPost,\n  \n  // Original components (useful for display/editing)\n  post_content: postContent,\n  hashtags: hashtags,\n  hashtag_string: hashtagString,\n  \n  // Metadata\n  character_count: characterCount,\n  word_count: wordCount,\n  hashtag_count: hashtags.length,\n  \n  // Quality checks (for next node)\n  is_within_limit: isWithinLimit,\n  has_minimum_hashtags: hasHashtags,\n  passes_quality_check: isWithinLimit && hasHashtags,\n  \n  // Additional info from AI\n  engagement_tip: engagementTip,\n  call_to_action: callToAction,\n  emoji_suggestions: emojiSuggestions,\n  \n  // Timestamp\n  generated_at: new Date().toISOString(),\n  \n  // Warning messages (if any)\n  warnings: [\n    !isWithinLimit ? `⚠️ Post exceeds 3000 characters (${characterCount} chars)` : null,\n    !hasHashtags ? `⚠️ Post has fewer than 3 hashtags (${hashtags.length} found)` : null\n  ].filter(Boolean)\n};",
				},
				position: [1024, 176],
				name: 'Post Formatter',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 2,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: 'd068b06d-d701-4817-93bc-98806b37e814',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
								leftValue: '={{$json.passes_quality_check}}',
								rightValue: '',
							},
						],
					},
				},
				position: [1360, 336],
				name: 'Validate Post Quality',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.1,
			config: {
				parameters: {
					text: "=You are an email formatting expert. Convert the following LinkedIn post into a clean, professional HTML email that works perfectly in Gmail.\n\nLinkedIn Post Content:\n{{ $json.final_post }}\n\nRequirements:\n- Create Gmail-compatible HTML (inline CSS only, no external stylesheets)\n- Use a clean, professional email layout\n- Make it mobile-responsive\n- Include the post content with proper formatting and line breaks\n- Add the hashtags at the bottom in a subtle, styled way\n- Use web-safe fonts (Arial, Helvetica, Georgia, Times New Roman)\n- Keep it simple - Gmail strips many CSS properties\n- Ensure good readability with proper spacing and typography\n- Use a maximum width of 600px for email clients\n- If the post contains a call-to-action, format it as regular text (not a button)\n- NEVER create button elements (<button>, <a>) or styled link buttons\n- Do not add any interactive elements that weren't in the original post content\n- Simply present the post content as formatted text with proper styling\n\nReturn ONLY the complete HTML code, nothing else. No explanations, no markdown code blocks, just pure HTML.",
					options: {},
					promptType: 'define',
				},
				position: [-224, 768],
				name: 'Format Content to HTML',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: 'example_email@gmail.com',
					message: '=LinkedIn Post Preview:\n\n{{ $json.output }}',
					options: {},
					subject: 'LinkedIn Post Preview - Ready to Publish',
				},
				credentials: { gmailOAuth2: { id: 'nRdBnd2Ua3MFAbal', name: 'Dummy' } },
				position: [112, 752],
				name: 'Send Post Preview',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: 'example_email@gmail.com',
					message:
						'=Your LinkedIn post preview has been sent to your inbox.\n\nPlease review the formatted preview email, then:\n- Click "Approve" to publish the post to LinkedIn\n- Click "Decline" to cancel\n\nTopic: {{ $(\'Limit to One Post\').first().json[\'Topic/Subject\'] }}',
					options: {},
					subject: 'Approve LinkedIn Post for Publishing',
					operation: 'sendAndWait',
					approvalOptions: { values: { approvalType: 'double' } },
				},
				credentials: { gmailOAuth2: { id: 'nRdBnd2Ua3MFAbal', name: 'Dummy' } },
				position: [112, 960],
				name: 'Send email for confirmation',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 2,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: 'dc53a05a-ed59-486c-8d99-d90abe52f221',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
								leftValue: '={{ $json.data.approved }}',
								rightValue: '',
							},
						],
					},
				},
				position: [320, 880],
				name: 'Check Email Approval',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 2,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: '46e8311b-ef84-4e79-9d89-d8207521e5c6',
								operator: { type: 'string', operation: 'equals' },
								leftValue: "={{ $('Get Post Idea').item.json['Include Image?'] }}",
								rightValue: 'Yes',
							},
						],
					},
				},
				position: [592, 1024],
				name: 'Check Image Preference',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 2,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: '40c4f5c0-c4ff-4421-946e-e1b8e0e604e9',
								operator: { type: 'string', operation: 'notEmpty', singleValue: true },
								leftValue: "={{ $('Limit to One Post').first().json['Image link for your post'] }}",
								rightValue: '',
							},
						],
					},
				},
				position: [768, 704],
				name: 'Validate Image URL',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"// Get the image link\nlet imageUrl = $('Limit to One Post').first().json['Image link for your post'];\n\n// Clean the URL\nimageUrl = imageUrl.trim();\n\n// Convert common sharing links to direct download links\n\n// Google Drive\nif (imageUrl.includes('drive.google.com/file/d/')) {\n  const fileIdMatch = imageUrl.match(/\\/d\\/([^\\/]+)/);\n  if (fileIdMatch) {\n    imageUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;\n  }\n}\n\n// Dropbox - change dl=0 to dl=1\nif (imageUrl.includes('dropbox.com') && imageUrl.includes('dl=0')) {\n  imageUrl = imageUrl.replace('dl=0', 'dl=1');\n}\n\n// Imgur - convert to direct image link\nif (imageUrl.includes('imgur.com/') && !imageUrl.includes('i.imgur.com')) {\n  imageUrl = imageUrl.replace('imgur.com/', 'i.imgur.com/') + '.jpg';\n}\n\n// OneDrive/SharePoint\nif (imageUrl.includes('sharepoint.com') || imageUrl.includes('1drv.ms')) {\n  // OneDrive links need special handling - append ?download=1\n  imageUrl = imageUrl.split('?')[0] + '?download=1';\n}\n\nreturn {\n  json: {\n    original_url: $('Limit to One Post').first().json['Image link for your post'],\n    direct_download_url: imageUrl\n  }\n};",
				},
				position: [1040, 688],
				name: 'Convert Share Link to Download Link',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '={{ $json.direct_download_url || $json.output.download_url }}',
					options: { response: { response: { responseFormat: 'file' } } },
				},
				position: [1984, 688],
				name: 'Download Image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.linkedIn',
			version: 1,
			config: {
				parameters: {
					text: "={{ $('Validate Post Quality').item.json.final_post }}",
					person: 'lo747ESwEe',
					additionalFields: {},
					shareMediaCategory: '=IMAGE',
				},
				credentials: {
					linkedInOAuth2Api: { id: 'RujxhXLLWThYidSO', name: 'Dummy' },
				},
				position: [2256, 784],
				name: 'Create a post with image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					columns: {
						value: {
							Status: '=Posted',
							row_number: "={{ $('Update Post Status').first().json.row_number }}",
						},
						schema: [
							{
								id: 'Topic/Subject',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Topic/Subject',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Content Type',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Content Type',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Tone',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Tone',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Target Audience',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Target Audience',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Additional Notes',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Additional Notes',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Image link for your post',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Image link for your post',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'row_number',
								type: 'number',
								display: true,
								removed: false,
								readOnly: true,
								required: false,
								displayName: 'row_number',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['row_number'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'update',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1500824165,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1qUir1c-_ScMnoYVoQ0W41nsv5IpLW6rjK8HUNqvNnAg/edit#gid=1500824165',
						cachedResultName: 'Automate LinkedIn Social Media Content Creation with AI - Gsheet',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1qUir1c-_ScMnoYVoQ0W41nsv5IpLW6rjK8HUNqvNnAg',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1qUir1c-_ScMnoYVoQ0W41nsv5IpLW6rjK8HUNqvNnAg/edit?usp=drivesdk',
						cachedResultName: 'example',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: { id: 'oURwy13SlM7ZHMDw', name: 'Dummy' },
				},
				position: [2576, 896],
				name: 'Update Post Status to Posted',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.unsplash.com/search/photos',
					options: {},
					sendQuery: true,
					sendHeaders: true,
					queryParameters: {
						parameters: [
							{
								name: 'query',
								value: "={{ $('AI Content Generation').first().json.output.image_prompt }}",
							},
							{ name: 'per_page', value: '10' },
						],
					},
					headerParameters: { parameters: [{ name: 'Authorization' }] },
				},
				position: [1040, 896],
				name: 'Get Image in Unsplash',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						'// Get data from previous n8n node\nconst inputData = $input.all();\n\n// Get the JSON data from the first item\nconst jsonData = inputData[0].json;\n\n// Navigate to the results array\nconst results = jsonData.results;\n\n// Create output object\nconst output = {\n  results: {}\n};\n\n// Process each result\nresults.forEach((item, index) => {\n  output.results[`results[${index}]`] = {\n    download: item.links.download,\n    alt_description: item.alt_description,\n    description: item.description\n  };\n});\n\n// Return the data for n8n\nreturn [{ json: output }];',
				},
				position: [1280, 896],
				name: 'Get Result Descriptions and Links',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.1,
			config: {
				parameters: {
					text: "=# LinkedIn Post Image Selection Prompt\n\nYou are an expert social media content strategist specializing in LinkedIn engagement. Your task is to analyze a LinkedIn post and select the most appropriate image from a list of available options.\n\n## LinkedIn Post Content:\n{{ $('AI Content Generation').first().json.output.post_content }}\n## Available Images:\n{{ JSON.stringify($json.results, null, 2) }}\n\nAnalyze each image based on:\n\n1. Relevance: How well does the image relate to the post's topic and message?\n2. Professional Appeal: Is the image appropriate for LinkedIn's professional audience?\n3. Visual Quality: Does the description suggest high-quality, clear imagery?\n4. Engagement Potential: Will this image stop scrollers and encourage interaction?\n5. Context Match: Does the image complement or enhance the post's narrative?\n\nYour Task:\n\n1. Review the LinkedIn post content carefully\n2. Evaluate each image option (results[0] through results[9])\n3. Consider the description and alt_description for context\n4. Select the SINGLE best image that will maximize engagement\n\nOutput Format:\n\nProvide your response in this exact JSON format:\n\n{\n  \"download_url\": \"[the download URL]\"\n}\n\nImportant Notes:\n- Choose only ONE image (the best match)\n- Base your decision on the descriptions provided\n- Consider LinkedIn's professional context\n- If no description exists (null), rely on alt_description only\n- Prioritize images that are clear, professional, and relevant\n\nNow, analyze the post and images, then provide your selection.",
					options: {},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [1536, 816],
				name: 'Choose Image',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.linkedIn',
			version: 1,
			config: {
				parameters: {
					text: "={{ $('Validate Post Quality').item.json.final_post }}",
					person: 'lo747ESwEe',
					additionalFields: {},
				},
				credentials: {
					linkedInOAuth2Api: { id: 'RujxhXLLWThYidSO', name: 'Dummy' },
				},
				position: [2256, 1040],
				name: 'Create a post',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					columns: {
						value: {
							Status: '=Rejected',
							row_number: "={{ $('Update Post Status').first().json.row_number }}",
						},
						schema: [
							{
								id: 'Topic/Subject',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Topic/Subject',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Content Type',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Content Type',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Tone',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Tone',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Target Audience',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Target Audience',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Additional Notes',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Additional Notes',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Image link for your post',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Image link for your post',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'row_number',
								type: 'number',
								display: true,
								removed: false,
								readOnly: true,
								required: false,
								displayName: 'row_number',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['row_number'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'update',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1500824165,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1qUir1c-_ScMnoYVoQ0W41nsv5IpLW6rjK8HUNqvNnAg/edit#gid=1500824165',
						cachedResultName: 'Automate LinkedIn Social Media Content Creation with AI - Gsheet',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1qUir1c-_ScMnoYVoQ0W41nsv5IpLW6rjK8HUNqvNnAg',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1qUir1c-_ScMnoYVoQ0W41nsv5IpLW6rjK8HUNqvNnAg/edit?usp=drivesdk',
						cachedResultName: 'example',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: { id: 'oURwy13SlM7ZHMDw', name: 'Dummy' },
				},
				position: [320, 1120],
				name: 'Update Post Status to Rejected',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.2,
			config: {
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'gpt-5.1',
						cachedResultName: 'gpt-5.1',
					},
					options: {},
				},
				credentials: { openAiApi: { id: 'rxfg6jEjEjPWmANV', name: 'Dummy' } },
				position: [560, 336],
				name: 'OpenAI Chat Model',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			version: 1.3,
			config: {
				parameters: {
					jsonSchemaExample:
						'{\n  "post_content": "The main LinkedIn post text goes here with emojis naturally integrated...",\n  "hashtags": ["#Marketing", "#Leadership", "#AI"],\n  "character_count": 285,\n  "engagement_tip": "Best time to post: Tuesday-Thursday, 8-10 AM",\n  "call_to_action": "What\'s your experience with this? Share in the comments!",\n  "image_prompt": "A detailed DALL-E prompt for generating a professional LinkedIn post image"\n}',
				},
				position: [752, 336],
				name: 'Structured Output Parser',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.2,
			config: {
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'gpt-4.1-mini',
						cachedResultName: 'gpt-4.1-mini',
					},
					options: {},
				},
				credentials: { openAiApi: { id: 'rxfg6jEjEjPWmANV', name: 'Dummy' } },
				position: [-224, 944],
				name: 'OpenAI Chat Model1',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			version: 1.3,
			config: {
				parameters: {
					jsonSchemaExample: '{\n  "download_url": "the download URL"\n}',
				},
				position: [1728, 960],
				name: 'Structured Output Parser1',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.2,
			config: {
				parameters: {
					model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
					options: {},
				},
				credentials: { openAiApi: { id: 'rxfg6jEjEjPWmANV', name: 'Dummy' } },
				position: [1536, 960],
				name: 'GPT-4.1-mini',
			},
		}),
	)
	.add(
		sticky(
			'# Create & track LinkedIn posts with Google Sheets, GPT-5.1, Unsplash, and Sona\n\nThis workflow generates professional LinkedIn posts using AI, intelligently selects relevant images from Unsplash, sends content for email approval, and publishes directly to LinkedIn.\n\n**How it works:**\n1. Checks Google Sheet daily at midnight for posts marked "Ready"\n2. Generates engaging LinkedIn content using GPT-4 with custom tone/audience\n3. Performs automatic quality checks (character limits, hashtags)\n4. Searches Unsplash for 10 relevant images based on post content\n5. Uses AI to intelligently select the best image that matches your post\'s message and tone\n6. Formats post as HTML with selected image and sends to your email for approval\n7. If approved: posts to LinkedIn with AI-selected image\n8. If rejected: updates sheet status to "Rejected" for review\n9. Updates sheet status to "Posted" upon successful publication\n\n\n**Setup Requirements:**\n- Create a Google Sheet with columns: Topic/Subject, Content Type, Tone, Target Audience, Additional Notes, Image link for your post (optional), Include Image?, Status\n- Connect OpenAI API with your API key (used for both content generation and image selection)\n- Connect Unsplash API with your access key\n- Connect Gmail OAuth2 and update recipient email in approval node\n- Connect Google Sheets OAuth2 and select your sheet from dropdown\n- Connect LinkedIn OAuth2 for posting\n\n\n**Scheduling Options:**\n- Default: Runs daily at midnight\n- Customizable: Change Schedule Trigger node to run hourly, weekly, or at specific times\n- The "Limit" node ensures only one post processes per run\n\n\n**Sheet Usage:**\n- Set Status to "Ready" to trigger content generation\n- Status changes: Ready → In Progress → Rejected (if disapproved) OR Posted (if approved)\n- Add image URL in "Image link for your post" column to use your own image (optional)\n- If no image URL provided, AI searches Unsplash and selects the most relevant image\n- Set "Include Image?" to "No" if you want text-only post\n- Review "Rejected" posts, edit if needed, and change back to "Ready" to retry\n\n\n**Image Selection Process:**\n- Searches Unsplash using keywords generated based on the linkedIn post.\n- Retrieves 10 professional, high-quality images\n- Uses AI to analyze each image\'s description and relevance\n- Selects the single best image that enhances your post\'s message\n- Ensures professional, LinkedIn-appropriate imagery\n\n\n**Note:** Workflow includes approval gate - nothing posts without your explicit email confirmation. All images are sourced from Unsplash\'s professional library and selected by AI for maximum relevance and engagement.',
			{ name: 'Sticky Note4', position: [-896, -64], width: 592, height: 1344 },
		),
	)
	.add(
		sticky(
			'## Input & Scheduling\n\nRuns daily at midnight, fetches one "Ready" post from Google Sheet, updates status to "In Progress"\n\n## Why This Matters:\n\n**Daily schedule means:**\n- ✅ More sustainable API usage (not hitting OpenAI 24 times a day)\n- ✅ Gives you time to prepare posts in advance\n- ✅ One consistent posting time\n- ❌ Less flexible if you want multiple posts per day',
			{ name: 'Sticky Note5', color: 7, position: [-288, -64], width: 784, height: 592 },
		),
	)
	.add(
		sticky(
			'## AI Content Generation\n\nGenerates LinkedIn post with GPT-5.1, performs quality checks (3000 char limit, min 3 hashtags). Loops back if quality check fails.',
			{ name: 'Sticky Note6', color: 7, position: [512, -64], width: 992, height: 592 },
		),
	)
	.add(
		sticky(
			'## Approval Workflow\n\nFormats post as HTML email, sends for approval, waits for response. If approved → proceeds to publishing. If rejected → updates sheet status to "Rejected".',
			{ name: 'Sticky Note7', color: 7, position: [-288, 544], width: 784, height: 736 },
		),
	)
	.add(
		sticky(
			'## Image Handling\n\nChecks if image link exists → converts share links to direct downloads OR generates image using Unsplash and AI to select the images.',
			{ name: 'Sticky Note8', color: 7, position: [512, 544], width: 1616, height: 736 },
		),
	)
	.add(
		sticky(
			'## Publishing\n\nPosts to LinkedIn (with/without image based on previous steps), updates sheet status to "Posted"',
			{ name: 'Sticky Note9', color: 7, position: [2144, 544], width: 640, height: 736 },
		),
	);
