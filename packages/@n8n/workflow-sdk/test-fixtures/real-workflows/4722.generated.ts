const wf = workflow('uf6t5qhnQMgilteE', 'Email Manager', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.gmailTrigger',
			version: 1.2,
			config: {
				parameters: { filters: {}, pollTimes: { item: [{ mode: 'everyMinute' }] } },
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [-20, -60],
				name: 'Gmail Trigger',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					simple: false,
					options: {},
					messageId: '={{ $json.id }}',
					operation: 'get',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [200, -20],
				name: 'Gmail',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: 'Run the task.',
					options: {
						systemMessage:
							'=**Objective:** Analyze the provided email data and classify it with the most appropriate label. **Utilize the capability to check for prior email history (emails sent to or received from the sender by `[REDACTED_EMAIL]`)** to determine if this is a first-time interaction (cold email) or part of an existing relationship. This context is crucial for accurate labeling, especially for distinguishing between Marketing, Notifications, and FYI. Respond with *only* the corresponding Label ID.\n\n**Your Email Address (for context):** `[REDACTED_EMAIL]`\n\n**Key Capabilities (to be used by the system executing this prompt):**\n* **Check Prior Email History:** Before full classification, determine if any prior email correspondence exists between `[REDACTED_EMAIL]` and `{{ $json.from.value[0].address }}`. This check should yield "Yes" (history exists) or "No" (no history found).\n\n**Input Email Data (from n8n JSON item for the *current* email):**\n* **Sender Email:** `{{ $json.from.value[0].address }}`\n* **Sender Name:** `{{ $json.from.value[0].name }}`\n* **Direct Recipient Emails (To):** `{{ $json.to.value.map(r => r.address).join(\', \') }}`\n* **CC Recipient Emails:** `{{ $json.cc.value.map(r => r.address).join(\', \') }}` *(Added this based on your JSON, use if populated)*\n* **Subject:** `{{ $json.subject }}`\n* **Body (Plain Text):** `{{ $json.text }}`\n* **Existing Gmail Labels (for current email):** `{{ $json.labelIds.join(\', \') }}`\n* **Auto-Submitted Header:** `{{ $json.headers[\'auto-submitted\'] }}`\n* **Original Sender Header (if different from From):** `{{ $json.headers.sender }}`\n* **In-Reply-To Header (for current email):** `{{ $json.headers[\'in-reply-to\'] }}`\n* **References Header (for current email):** `{{ $json.headers.references }}`\n* **List-Unsubscribe Header:** `{{ $json.headers[\'list-unsubscribe\'] }}`\n* **Precedence Header:** `{{ $json.headers.precedence }}` (e.g., "Bulk")\n\n**Labels, Descriptions, and Prioritization Logic:**\n\n**Guidance on Using Prior Email History & Unsubscribe Links:**\n* **Prior Email History = "No":** Strong indicator of a **cold/unsolicited email**.\n    * If promotional/sales pitch: Likely "Marketing."\n    * If exceptionally personalized & high-value for Trigify: Rare "To Respond."\n* **Prior Email History = "Yes":** Indicates an **existing relationship/conversation**.\n    * If it\'s an update on terms, policies, or service changes from this known entity: Likely "Notification."\n    * If it\'s a newsletter Max subscribed to: Could be "FYI" or "Marketing" based on content.\n    * If it\'s a direct message requiring action: Likely "To Respond."\n* **`List-Unsubscribe` Header or Unsubscribe Links in Body:**\n    * Common in "Marketing" emails.\n    * Also present in many legitimate "Notification" emails (e.g., service updates, policy changes like the DPA example) and some "FYI" newsletters for compliance.\n    * **Therefore, an unsubscribe link alone does not define the category. Consider it alongside Prior Email History and email content/purpose.**\n* **`Precedence: Bulk` Header:** Often indicates mass mailings, common for Marketing, Notifications, and some FYIs.\n\n---\n\n* **To Respond (Label ID: `Label_5151750749488724401`):**\n    * **Primary Criteria:** Requires direct, timely action/reply from `[REDACTED_EMAIL]`.\n    * **Key Indicators (especially if Prior Email History = "Yes"):** Direct questions to Max, assigned tasks, requests for info for Trigify, deadlines for Max, part of an active conversation (indicated by `In-Reply-To`/`References`).\n    * **Sales Process Prioritization (Warm Leads/Active Processes - typically Prior Email History = "Yes"):** Ongoing, active Trigify sales process discussions.\n    * **High-Value Cold Outreach (Exceptional Cases - Prior Email History = "No"):** Highly personalized, strategic opportunity for Trigify requiring Max\'s personal attention. (Default for cold sales is "Marketing").\n\n* **FYI (Label ID: `Label_7518716752151077752`):**\n    * **Primary Criteria:** For Max\'s awareness; no immediate action/reply required.\n    * **Key Indicators:**\n        * Max is CC\'d, primary action for others.\n        * General announcements, *non-promotional* newsletters from *known entities/subscriptions* (Prior Email History = "Yes" or sender is clearly a subscribed source) that aren\'t critical service notifications.\n        * Informational updates within ongoing projects where Max isn\'t the primary actor.\n    * If an email is a mass mailing (`Precedence: Bulk`, `List-Unsubscribe` present) from a *known entity* (Prior Email History = "Yes") and is purely informational without a direct call to action or critical service update, it could be "FYI."\n\n* **Comment (Label ID: `Label_1470120230130814788`):**\n    * Comment/feedback on a document, task, system (e.g., subject "New comment on...").\n\n* **Notification (Label ID: `Label_9`):**\n    * **Primary Criteria:** Provides important, often non-promotional, updates or alerts regarding an existing service, account, or system that `[REDACTED_EMAIL]` or Trigify uses or is affected by. Action is typically awareness, potential configuration change, or noting a deadline, rather than a conversational reply.\n    * **Key Indicators:**\n        * **Updates from Known Service Providers (Prior Email History = "Yes" is common):**\n            * Changes to Terms of Service, Privacy Policies, Data Processing Agreements (DPAs like the "Plain" example).\n            * Critical service availability announcements (outages, maintenance).\n            * Security alerts related to an account Max uses.\n            * Important updates about features or functionality of a service Trigify relies on, which are not primarily marketing new features.\n        * System-generated alerts (e.g., `Auto-Submitted Header` = `auto-generated`) like social media notifications, non-meeting calendar reminders, some financial transaction alerts.\n        * Subject lines may contain: "Important Update," "Service Notification," "Policy Change," "DPA Update," "Security Alert."\n        * Even if a `List-Unsubscribe` link is present (for compliance), if the core content is a critical service/account/legal update from a company Max/Trigify does business with, it\'s a "Notification."\n        * The `Existing Gmail Labels` might include `CATEGORY_UPDATES`.\n\n* **Meeting Update (Label ID: `Label_7958083858424702466`):**\n    * Update specifically regarding a scheduled meeting (e.g., "Accepted:", "Declined:", "Updated Invitation:", "Cancelled:").\n\n* **Marketing (Label ID: `Label_5274550748854913384`):**\n    * **Primary Criteria:** Unsolicited promotional sales pitch, advertisement, or general marketing newsletter, especially if **Prior Email History = "No."**\n    * **Key Indicators:**\n        * **No prior email history found with the `Sender Email`,** AND the email is primarily aimed at selling a product/service or promoting a company/event to Max/Trigify.\n        * Content is generic, focused on features/benefits without strong personalization to Max\'s known, active projects.\n        * Contains a `List-Unsubscribe Header` AND the content is promotional.\n        * `Existing Gmail Labels` may include `CATEGORY_PROMOTIONS`.\n    * If **Prior Email History = "Yes"**: Could still be "Marketing" if it\'s a clearly promotional newsletter/offer from a known contact that doesn\'t fit "Notification" or demand a "To Respond."\n\n---\n\n**Email Data for Classification (Summary):**\n* **Prior Email History with Sender (Yes/No) - From the new capability**\n* Sender Email: `{{ $json.from.value[0].address }}`\n* Sender Name: `{{ $json.from.value[0].name }}`\n* Direct Recipient Emails (To): `{{ $json.to.value.map(r => r.address).join(\', \') }}`\n* CC Recipient Emails: `{{ $json.cc.value.map(r => r.address).join(\', \') }}`\n* Subject: `{{ $json.subject }}`\n* Body (Plain Text): `{{ $json.text }}`\n* Existing Gmail Labels: `{{ $json.labelIds.join(\', \') }}`\n* Auto-Submitted Header: `{{ $json.headers[\'auto-submitted\'] }}`\n* Original Sender Header: `{{ $json.headers.sender }}`\n* In-Reply-To Header: `{{ $json.headers[\'in-reply-to\'] }}`\n* References Header: `{{ $json.headers.references }}`\n* List-Unsubscribe Header: `{{ $json.headers[\'list-unsubscribe\'] }}`\n* Precedence Header: `{{ $json.headers.precedence }}`\n\n**Output:** [Provide ONLY the Label ID here]',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					tools: [
						tool({
							type: 'n8n-nodes-base.gmailTool',
							version: 2.1,
							config: {
								parameters: {
									filters: { q: "=from:{{ $fromAI('email') }}" },
									operation: 'getAll',
									returnAll:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Return_All', ``, 'boolean') }}",
								},
								credentials: {
									gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
								},
								name: 'Get Email',
							},
						}),
						tool({
							type: 'n8n-nodes-base.gmailTool',
							version: 2.1,
							config: {
								parameters: {
									filters: { q: "=to:{{ $fromAI('email') }}", labelIds: ['SENT'] },
									operation: 'getAll',
								},
								credentials: {
									gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
								},
								name: 'Check Sent',
							},
						}),
					],
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
						version: 1.3,
						config: {
							parameters: {
								model: {
									__rl: true,
									mode: 'list',
									value: 'claude-sonnet-4-20250514',
									cachedResultName: 'Claude Sonnet 4',
								},
								options: {},
							},
							credentials: {
								anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' },
							},
							name: 'Anthropic Chat Model',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.2,
						config: {
							parameters: {
								jsonSchemaExample: '{\n	"label": "Label name", \n"label ID": "label ID" \n}',
							},
							name: 'Structured Output Parser',
						},
					}),
				},
				position: [500, -140],
				name: 'AI Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					labelIds: "={{ $json.output['label ID'] }}",
					messageId: "={{ $('Gmail').item.json.id }}",
					operation: 'addLabels',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [1020, -220],
				name: 'Gmail1',
			},
		}),
	);
