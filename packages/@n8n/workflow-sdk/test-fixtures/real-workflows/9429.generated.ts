const wf = workflow('83Ad0ngUzuJQHqb6', 'AI Voice Assistant | Shareable', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2.1,
			config: {
				parameters: {
					path: 'REPLACE ME',
					options: {},
					httpMethod: 'POST',
					responseMode: 'responseNode',
				},
				position: [1008, 400],
				name: 'Webhook: Receive User Request (ElevenLabs)',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: {
				parameters: {
					text: '=# n8n Scheduling Assistant\n\n## CONTEXT\n- Current time: {{ $now }} [TIMEZONE]\n- Session ID: {{ $json.body.sessionId }}\n- User utterance: {{ $json.body.utterance }}\n- Caller\'s phone number: {{ $json.body.system_caller_id }}\n- Full conversation: {{ $json.body.call_log }}\n\n## TOOLS\n1. think - ALWAYS use first to analyze state\n2. get_availability - Check calendar ([APPOINTMENT_DURATION]-min slots)\n3. create_appointment - Book appointment\n4. update_appointment - Modify existing appointment\n\n## VOICE RULES\n- ONE short sentence per response\n- Spell email handles pre-domain with hyphens: j-o-h-n-@-gmail.com\n- Spell phone numbers with hyphens: +-1-4-0-8-3-4-0-3-2-6-5\n- Be concise and natural\n\n## BOOKING FLOW\n\n### 1. TIME SELECTION\n**User wants to schedule but no specific time:**\n- Check availability and offer: "I have [earliest slot] or [second earliest slot] available. Which works better?"\n\n**User suggests specific time:**\n- Check availability\n- Hours are [START_TIME]-[END_TIME], [OPERATING_DAYS] | NEVER ALLOW BOOKING NOR SUGGEST BOOKING [BLOCKED_DAYS] EVEN FOR AN EMERGENCY\n- Never allow booking of a time within the next [MINIMUM_LEAD_TIME] minutes EVEN FOR AN EMERGENCY\n- If available: "[Time] works. Want to book it?"\n- If conflict: "That\'s taken. I have [earlier] or [later] available."\n\n### 2. COLLECT INFORMATION\n**First, check call_log for any previously mentioned info ([REQUIRED_FIELDS])**\n\n**After time confirmed, ask ONLY for missing info:**\n- If nothing in history: "Great! I need [REQUIRED_FIELDS_NATURAL_LANGUAGE]."\n- If some info exists: "Great! I just need [missing items]."\n\n**If user provides partial info:**\n"Thanks! I still need [missing items]."\n\n### 3. CONFIRM EVERYTHING\n**Once all info collected:**\n"Let me confirm - [spell email], service at [address], and is this the best phone number to reach you at {{ $json.body.system_caller_id }}?"\n\n**User must say yes/correct to proceed**\n\n### 4. BOOK APPOINTMENT\n**After confirmation:**\n1. Create appointment with all details from call_log:\n   - Title: "[SERVICE_TYPE] - [PRIMARY_IDENTIFIER]"\n   - Duration: [APPOINTMENT_DURATION] minutes\n   - Always include in the notes: [REQUIRED_NOTES_FIELDS]\n   - When scheduling an appointment, always include the customer\'s email address as an attendee so they receive the calendar invite\n\n2. Response: "Perfect! Your appointment is booked for [day] at [time]. Is there anything else I can help you with today?"\n\n## APPOINTMENT UPDATES\nIf user wants changes after booking:\n- Use update_appointment (not create)\n- Confirm the change: "Updated to [new details]."\n\n## CRITICAL RULES\n✓ ALWAYS use think first\n✓ ALWAYS collect all required fields: [REQUIRED_FIELDS_LIST]\n✓ ALWAYS spell email for confirmation\n✓ ALWAYS end with "anything else I can help with?"\n✓ NEVER book without explicit confirmation\n✓ NEVER create duplicate appointments\n\n## DO NOT\n- Ask for information multiple times\n- Say "I\'ll confirm" repeatedly\n- Book overlapping appointments\n- Skip any of the required fields',
					options: {},
					promptType: 'define',
				},
				subnodes: {
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryRedisChat',
						version: 1.5,
						config: {
							parameters: {
								sessionKey: '={{ $json.body.sessionId }}',
								sessionIdType: 'customKey',
								contextWindowLength: 20,
							},
							credentials: { redis: { id: 'credential-id', name: 'redis Credential' } },
							name: 'Redis Chat Memory',
						},
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
						version: 1.3,
						config: {
							parameters: {
								model: {
									__rl: true,
									mode: 'list',
									value: 'claude-3-5-sonnet-20241022',
									cachedResultName: 'Claude Sonnet 3.5 (New)',
								},
								options: {},
							},
							credentials: {
								anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' },
							},
							name: 'Anthropic Chat Model',
						},
					}),
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolThink',
							version: 1.1,
							config: { name: 'Reasoning Tool (LangChain)' },
						}),
						tool({
							type: 'n8n-nodes-base.googleCalendarTool',
							version: 1.3,
							config: {
								parameters: {
									options: {},
									timeMax:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Before', ``, 'string') }}",
									timeMin:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('After', ``, 'string') }}",
									calendar: { __rl: true, mode: 'id', value: '=REPLACE ME' },
									operation: 'getAll',
									returnAll:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Return_All', ``, 'boolean') }}",
								},
								credentials: {
									googleCalendarOAuth2Api: {
										id: 'credential-id',
										name: 'googleCalendarOAuth2Api Credential',
									},
								},
								name: 'Calendar: Check Availability',
							},
						}),
						tool({
							type: 'n8n-nodes-base.googleCalendarTool',
							version: 1.3,
							config: {
								parameters: {
									end: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('End', ``, 'string') }}",
									start:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Start', ``, 'string') }}",
									calendar: { __rl: true, mode: 'id', value: '=REPLACE ME' },
									additionalFields: {
										summary:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Summary', ``, 'string') }}",
										attendees: [
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('attendees0_Attendees', ``, 'string') }}",
										],
										description:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Description', ``, 'string') }}",
										sendUpdates: 'all',
									},
								},
								credentials: {
									googleCalendarOAuth2Api: {
										id: 'credential-id',
										name: 'googleCalendarOAuth2Api Credential',
									},
								},
								name: 'Calendar: Create Appointment',
							},
						}),
						tool({
							type: 'n8n-nodes-base.googleCalendarTool',
							version: 1.3,
							config: {
								parameters: {
									eventId:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Event_ID', ``, 'string') }}",
									calendar: { __rl: true, mode: 'id', value: '=REPLACE ME' },
									operation: 'update',
									updateFields: {},
									useDefaultReminders: '=',
								},
								credentials: {
									googleCalendarOAuth2Api: {
										id: 'credential-id',
										name: 'googleCalendarOAuth2Api Credential',
									},
								},
								name: 'Update an event in Google Calendar',
							},
						}),
					],
				},
				position: [1232, 400],
				name: 'Voice AI Agent',
			},
		}),
	)
	.then(
		trigger({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.4,
			config: {
				parameters: { options: {} },
				position: [1552, 400],
				name: 'Webhook: Return AI Response (ElevenLabs)',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.4,
			config: {
				parameters: { options: {} },
				position: [1552, 400],
				name: 'Webhook: Return AI Response (ElevenLabs)',
			},
		}),
	)
	.add(
		sticky(
			'## PROMPT CONFIGURATION REQUIRED\n\n1. **[TIMEZONE]** - Set your timezone (e.g., PST, EST, GMT)\n\n2. **[APPOINTMENT_DURATION]** - Default appointment length in minutes (e.g., 30, 45, 60)\n\n3. **[START_TIME] & [END_TIME]** - Business hours (e.g., 8am & 6pm)\n\n4. **[OPERATING_DAYS]** - Days you\'re open (e.g., Monday through Friday)\n\n5. **[BLOCKED_DAYS]** - Days never available (e.g., Saturday or Sunday)\n\n6. **[MINIMUM_LEAD_TIME]** - Buffer time before appointments in minutes (e.g., 60)\n\n7. **[REQUIRED_FIELDS]** - Data you need to collect (e.g., email, phone, address)\n\n8. **[REQUIRED_FIELDS_NATURAL_LANGUAGE]** - How to ask for the fields (e.g., "the service address and your email")\n\n9. **[REQUIRED_FIELDS_LIST]** - List format for critical rules (e.g., "address, email, phone")\n\n10. **[SERVICE_TYPE]** - Your service name (e.g., "Plumbing Service", "Consultation", "Dental Appointment")\n\n11. **[PRIMARY_IDENTIFIER]** - What goes after service type in title (e.g., [Address], [Customer Name], [Service Details])\n\n12. **[REQUIRED_NOTES_FIELDS]** - What to include in appointment notes (e.g., "Problem description from call_log, user\'s email, user\'s address, and user\'s phone number")\n\n**NOTE:** Keep all {{ }} variables exactly as they are - these dynamically pull data from the ElevenLabs webhook and should NOT be modified.',
			{ color: 4, position: [816, -224], width: 1120, height: 608 },
		),
	)
	.add(
		sticky(
			'## AI MODEL CONFIGURATION\n**Recommended:** Claude 3.5 Sonnet provides best results for voice interactions due to superior reasoning and instruction following.\n\n**Alternative Options:**\n- GPT-4 models can work but may require prompt adjustments\n- Smaller models may struggle with complex scheduling logic\n- Test thoroughly if using non-Claude models\n\n**Note:** The "think" tool is critical for maintaining conversation state - do not remove it regardless of model choice.',
			{ name: 'Sticky Note1', position: [416, 736], width: 448, height: 336 },
		),
	)
	.add(
		sticky(
			'## WEBHOOK SETUP\n1. Replace "REPLACE ME" in the webhook path with your desired endpoint\n2. This webhook URL will be provided to ElevenLabs for integration\n3. Ensure webhook is set to POST method\n4. Test with ElevenLabs webhook tester before going live',
			{ name: 'Sticky Note2', color: 3, position: [416, 496], width: 448, height: 224 },
		),
	)
	.add(
		sticky(
			'## GOOGLE CALENDAR SETUP\n1. Replace all instances of "REPLACE ME" in calendar nodes with your Calendar ID\n2. Calendar ID format: xxxxx@group.calendar.google.com or your-email@gmail.com\n3. Ensure calendar has appropriate sharing permissions\n4. Connect your Google account via OAuth2 in credentials',
			{ name: 'Sticky Note3', color: 4, position: [1408, 784], width: 512, height: 192 },
		),
	)
	.add(
		sticky(
			'## REDIS MEMORY SETUP\nRedis memory is necessary for this workflow to function properly. Without memory, the AI must reparse the entire conversation on every turn, causing severe lag and breaking the real-time voice experience.\n\n**Configuration:**\n- Stores 20 messages per session (adjustable in contextWindowLength parameter)\n- Uses session ID from ElevenLabs to maintain conversation continuity\n- Session data persists between calls from the same user\n- Configure Redis connection in credentials before using this workflow',
			{ name: 'Sticky Note4', color: 6, position: [880, 784], width: 512, height: 288 },
		),
	);
