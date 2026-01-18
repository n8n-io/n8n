const wf = workflow('1RHsJldA8GlWFp1E', 'Smart Email Auto-Responder', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.gmailTrigger',
			version: 1.2,
			config: {
				parameters: {
					simple: false,
					filters: { labelIds: ['Label_43975351283257832'] },
					options: {},
					pollTimes: { item: [{ mode: 'everyHour' }] },
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [1480, 220],
				name: 'Gmail Trigger',
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
						combinator: 'or',
						conditions: [
							{
								id: '7cffe101-333d-4ec2-a822-181fe421745b',
								operator: { type: 'string', operation: 'contains' },
								leftValue: '={{ $json.headers.from }}',
								rightValue: '@syncbricks.com',
							},
						],
					},
				},
				position: [1640, 220],
				name: 'Emails from Existing Contracts',
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
								id: '07a6d5e2-ffc5-41d8-b69a-abd6860879c0',
								operator: { type: 'string', operation: 'notStartsWith' },
								leftValue: '={{ $json.subject }}',
								rightValue: 'Re:',
							},
						],
					},
				},
				position: [1640, 460],
				name: 'Reply',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.textClassifier',
			version: 1,
			config: {
				parameters: {
					options: {},
					inputText:
						"={{ $('Gmail Trigger').item.json.subject }}\n{{ $('Gmail Trigger').item.json.text }}",
					categories: {
						categories: [
							{
								category: 'Questions',
								description:
									'Use this category when the email is asking for information about our company, products, processes, pricing, timelines, legal terms or any other general inquiry that expects a factual explanation or guidance.',
							},
							{
								category: 'Project Update',
								description:
									'Choose this category when the sender is notifying us about progress or changes: signing the agreement, submitting or revising scripts, updating requirements, sharing evaluation results, or any status report that moves an ongoing project forward',
							},
							{
								category: 'Feedback',
								description:
									'Select this category when the email contains compliments, complaints, suggestions, or any qualitative feedback about our service, product, communication or overall experience',
							},
						],
					},
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: {
							parameters: { options: {}, modelName: 'models/gemini-2.0-flash-exp' },
							credentials: {
								googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
							},
							name: 'Google Gemini Chat Model',
						},
					}),
				},
				position: [1820, 400],
				name: 'Text Classifier',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleCalendar',
			version: 1.3,
			config: {
				parameters: {
					limit: 3,
					options: {
						query: 'Available – Office Visit',
						orderBy: 'startTime',
						recurringEventHandling: 'expand',
					},
					timeMax: '=',
					calendar: {
						__rl: true,
						mode: 'list',
						value: 'user@example.com',
						cachedResultName: 'Meeting slots',
					},
					operation: 'getAll',
				},
				credentials: {
					googleCalendarOAuth2Api: {
						id: 'credential-id',
						name: 'googleCalendarOAuth2Api Credential',
					},
				},
				position: [2100, 160],
				name: 'Google Calendar',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [2280, 160], name: 'Loop Over Items' },
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
						"const triggerJson = $('Gmail Trigger').item.json;\nconst headersFrom  = triggerJson.headers.from;      // \"Name <user@example.com>\"\n\n// Split into name and address\nconst namePart = headersFrom.split('<')[0].replace(/^From:\\s*/i, '').trim();\nconst emailPart = headersFrom.match(/<([^>]+)>/)?.[1] || headersFrom;\n\nconst slotTimes = items.map(i =>\n  new Date(i.json.start.dateTime || i.json.start.date).toLocaleString(\n    'en-US',\n    { weekday:'short', month:'short', day:'numeric', hour:'numeric',\n      minute:'2-digit', hour12:true }\n  )\n);\n\nreturn [{\n  json: {\n    slotTimes,\n    senderName:  namePart,\n    senderEmail: emailPart,\n    originalSub: triggerJson.subject               // pass the subject along\n  }\n}];\n",
				},
				position: [2520, 140],
				name: 'Code',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.emailSend',
			version: 2.1,
			config: {
				parameters: {
					html: "=<p>\n  Hi {{ $json.senderName }} <{{ $json.senderEmail }}>,\n</p>\n\n<p>Thanks for reaching out with your questions. I’d love to cover everything face-to-face.</p>\n\n<p><strong>Location:</strong><br>\n123 Main St<br>\nLos Angeles, CA 90089\n</p>\n\n<p>We just sent you three calendar invitations for these time slots:</p>\n\n<ul>\n  {{ $json.slotTimes.map(t => `<li>${t}</li>`).join('') }}\n</ul>\n\n<p>\n  Click <em>Yes</em> on the invite that works best for you.  \n  Google will reserve that slot automatically; the other two will stay open.\n</p>\n\n<p>\n  If none of the times work, reply with a couple of alternatives and I’ll find something that fits.\n</p>\n\n<p>Looking forward to meeting you!<br>— Corvin</p>\n",
					options: { appendAttribution: false },
					subject: '=Re: {{ $json.originalSub }}',
					toEmail: '={{ $json.senderName }} <{{ $json.senderEmail }}>',
					fromEmail: 'user@example.com',
				},
				credentials: { smtp: { id: 'credential-id', name: 'smtp Credential' } },
				position: [2720, 160],
				name: 'QuestionsReply',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					messageId: "={{ $('Gmail Trigger').all()[0].json.id }}\n",
					operation: 'markAsRead',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [2780, 460],
				name: 'Mark as Read',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					labelIds: ['CATEGORY_UPDATES'],
					messageId: "={{ $('Gmail Trigger').all()[0].json.id }}\n",
					operation: 'addLabels',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [2960, 460],
				name: 'Apply Label',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.googleCalendar',
			version: 1.3,
			config: {
				parameters: {
					eventId: '={{$json.id}}',
					calendar: {
						__rl: true,
						mode: 'list',
						value: 'user@example.com',
						cachedResultName: 'Meeting slots',
					},
					operation: 'update',
					updateFields: {
						attendeesUi: {
							values: {
								attendees: ['={{ $("Gmail Trigger").item.json.from.value[0].address }}\n'],
							},
						},
						sendUpdates: 'all',
					},
				},
				credentials: {
					googleCalendarOAuth2Api: {
						id: 'credential-id',
						name: 'googleCalendarOAuth2Api Credential',
					},
				},
				position: [2520, 300],
				name: 'Google Calendar1',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.emailSend',
			version: 2.1,
			config: {
				parameters: {
					html: '=<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;}\n    .container{width:100%;max-width:600px;margin:0 auto;padding:20px;}\n    .header{background:#f4f4f4;padding:10px 20px;text-align:center;border-bottom:1px solid #ddd;}\n    .header h1{margin:0;color:#555;}\n    .content{padding:20px;}\n    .content h2{color:#555;font-size:18px;margin:20px 0 10px;}\n    .content p{margin-bottom:15px;}\n    .content ul{list-style:disc;padding-left:20px;}\n    .content ul li{margin-bottom:10px;}\n    .content a{color:#007BFF;text-decoration:none;}\n    .content a:hover{text-decoration:underline;}\n    .footer{text-align:center;font-size:12px;color:#888;margin-top:20px;}\n  </style>\n</head>\n<body>\n  <div class="container">\n    <div class="header">\n      <h1>Project Update Acknowledgement</h1>\n    </div>\n\n    <div class="content">\n      <p>\n        Hi {{ $json.from.value[0].name || $(\'Gmail Trigger\').item.json.headers.from.split(\'<\')[0].trim() || \'there\' }},\n      </p>\n\n      <p>\n        Thank you for your recent update on the project. We’ve reviewed the information you provided and have logged it in our system.\n      </p>\n\n      <h2>What we received:</h2>\n      <ul>\n        <li>Signed agreement / contract confirmation.</li>\n        <li>Revised requirements or scope changes.</li>\n        <li>Draft scripts or other deliverables for review.</li>\n        <li>Evaluation results or performance reports.</li>\n      </ul>\n\n      <h2>Next steps:</h2>\n      <ul>\n        <li>Our team will review the materials and integrate any changes within <strong>2–3 business days</strong>.</li>\n        <li>If clarifications are needed, we’ll reach out via email or schedule a quick call.</li>\n        <li>You’ll receive the updated project timeline once the review is complete.</li>\n      </ul>\n\n      <p>\n        If you have additional files or questions, feel free to reply directly to this email.\n      </p>\n\n      <p>\n        We appreciate your prompt communication and look forward to moving the project ahead smoothly.\n      </p>\n\n      <p>\n        Best regards,<br>\n        <strong>Sophia Mitchell</strong><br>\n        Project Coordinator | <a href="https://syncbricks.com" target="_blank">syncbricks.com</a><br>\n        WhatsApp: +1 &nbsp;\n      </p>\n    </div>\n\n    <div class="footer">\n      © 2025 SyncBricks. All rights reserved.\n    </div>\n  </div>\n</body>\n</html>\n',
					options: { appendAttribution: false },
					subject: "=Re: {{ $('Gmail Trigger').item.json.subject }}",
					toEmail: '={{ $json.from.value[0].name }} <{{ $json.from.value[0].address }}>',
					fromEmail: 'user@example.com',
				},
				credentials: { smtp: { id: 'credential-id', name: 'smtp Credential' } },
				position: [2260, 580],
				name: 'Youtube Video Inquiry',
			},
		}),
	)
	.output(2)
	.then(
		node({
			type: 'n8n-nodes-base.emailSend',
			version: 2.1,
			config: {
				parameters: {
					html: '=<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;}\n    .container{width:100%;max-width:600px;margin:0 auto;padding:20px;}\n    .header{background:#f4f4f4;padding:10px 20px;text-align:center;border-bottom:1px solid #ddd;}\n    .header h1{margin:0;color:#555;}\n    .content{padding:20px;}\n    .content h2{color:#555;font-size:18px;margin:20px 0 10px;}\n    .content p{margin-bottom:15px;}\n    .content ul{list-style:disc;padding-left:20px;}\n    .content ul li{margin-bottom:10px;}\n    .content a{color:#007BFF;text-decoration:none;}\n    .content a:hover{text-decoration:underline;}\n    .footer{text-align:center;font-size:12px;color:#888;margin-top:20px;}\n  </style>\n</head>\n<body>\n  <div class="container">\n    <div class="header">\n      <h1>Thank You for Your Feedback</h1>\n    </div>\n\n    <div class="content">\n      <p>\n        Hi {{ $json.from.value?.[0]?.name || $(\'Gmail Trigger\').item.json.headers.from.split(\'<\')[0].trim() || \'there\' }},\n      </p>\n\n      <p>\n        Thank you for taking the time to share your feedback about SyncBricks. We truly value every comment—whether a\n        compliment, suggestion, or concern—because it helps us improve.\n      </p>\n\n      <h2>What happens next:</h2>\n      <ul>\n        <li>Your message has been logged in our system&nbsp;(<strong>Reference ID:</strong>\n          {{ $json.id.slice(-6) }}).</li>\n        <li>Our team will review it within <strong>1 business day</strong>.</li>\n        <li>If an action is required, the appropriate team member will follow up directly with you.</li>\n      </ul>\n\n      <p>\n        If you need to add more details, simply reply to this email—your message wil\n',
					options: { appendAttribution: false },
					subject: "=Re:  {{ $('Gmail Trigger').item.json.Subject }}",
					toEmail: '={{ $json.from.value[0].name }} <{{ $json.from.value[0].address }}>',
					fromEmail: 'user@example.com',
				},
				credentials: { smtp: { id: 'credential-id', name: 'smtp Credential' } },
				position: [2260, 760],
				name: 'Send Email',
			},
		}),
	);
