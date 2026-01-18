const wf = workflow('sCy7Dz1t2CXusiPB', 'Prompt generator', {
	callerPolicy: 'workflowsFromSameOwner',
	executionOrder: 'v1',
	executionTimeout: -1,
})
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.2,
			config: {
				parameters: {
					options: {
						customCss:
							'/* N8N Landing Page CSS - Correct Selectors Based on HTML */\n\n/* Style the main form card */\n.card {\n	position: relative;\n	max-width: 500px;\n	margin: 20px auto;\n	padding: 20px;\n	background: white !important;\n	border-radius: 12px;\n	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);\n	font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;\n}\n\n/* Add custom header with gradient */\n.card:before {\n	content: \'\';\n	display: block;\n	height: 50px;\n	background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);\n	position: relative;\n	margin: -20px -20px 30px -20px;\n	border-radius: 12px 12px 0 0;\n}\n\n/* Style the form header */\n.form-header {\n	text-align: center !important;\n	color: #1f2937 !important;\n	font-weight: 700 !important;\n	margin: 80px 0 15px 0 !important;\n	font-size: 2.2em !important;\n	position: relative;\n	z-index: 5;\n}\n\n/* Style any h1, h2 elements in the form */\n.card h1,\n.card h2 {\n	text-align: center !important;\n	color: #1f2937 !important;\n	font-weight: 700 !important;\n	margin: 80px 0 15px 0 !important;\n	font-size: 2.2em !important;\n	position: relative;\n	z-index: 5;\n}\n\n/* Style paragraphs and description text */\n.card p {\n	text-align: center !important;\n	color: #6b7280 !important;\n	font-size: 1.1em !important;\n	margin-bottom: 30px !important;\n	line-height: 1.5 !important;\n	position: relative;\n	z-index: 5;\n}\n\n/* Style the inputs wrapper */\n.inputs-wrapper {\n	position: relative;\n	z-index: 5;\n}\n\n/* Style all input fields */\n.card input[type="text"],\n.card input[type="email"],\n.card input[type="tel"],\n.card input[type="number"],\n.card textarea,\n.card select {\n	width: 100% !important;\n	padding: 12px 16px !important;\n	border: 2px solid #e5e7eb !important;\n	border-radius: 8px !important;\n	font-size: 16px !important;\n	transition: border-color 0.3s ease !important;\n	margin-bottom: 15px !important;\n	box-sizing: border-box !important;\n}\n\n.card input[type="text"]:focus,\n.card input[type="email"]:focus,\n.card input[type="tel"]:focus,\n.card input[type="number"]:focus,\n.card textarea:focus,\n.card select:focus {\n	outline: none !important;\n	border-color: #6366f1 !important;\n	box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;\n}\n\n/* Style the submit button */\n.card button[type="submit"],\n.card input[type="submit"] {\n	background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%) !important;\n	color: white !important;\n	border: none !important;\n	padding: 15px 40px !important;\n	border-radius: 10px !important;\n	font-size: 18px !important;\n	font-weight: 600 !important;\n	cursor: pointer !important;\n	width: 100% !important;\n	margin-top: 20px !important;\n	transition: all 0.3s ease !important;\n	box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3) !important;\n	position: relative;\n	z-index: 5;\n}\n\n.card button[type="submit"]:hover,\n.card input[type="submit"]:hover {\n	transform: translateY(-2px) !important;\n	box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4) !important;\n}\n\n/* Style the body to complement the form */\nbody.vsc-initialized {\n	background: #f8fafc !important;\n	font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif !important;\n	margin: 0 !important;\n	padding: 20px !important;\n}\n\n/* Style the container div */\n.container {\n	max-width: 600px !important;\n	margin: 0 auto !important;\n}\n\n/* Mobile responsive */\n@media (max-width: 768px) {\n	.card {\n		margin: 10px !important;\n		padding: 15px !important;\n	}\n	\n	.card:before {\n		height: 50px !important;\n		margin: -15px -15px 20px -15px !important;\n	}\n	\n	.card:after {\n		top: 35px !important;\n		font-size: 35px !important;\n	}\n	\n	.form-header,\n	.card h1,\n	.card h2 {\n		font-size: 1.8em !important;\n		margin: 60px 0 15px 0 !important;\n	}\n}',
						buttonLabel: "Let's Generate",
						appendAttribution: false,
					},
					formTitle: '🚀 AI Prompt Generator',
					formDescription: 'Create powerful prompts for your AI tools',
				},
				position: [-1140, -20],
				name: 'On form submission',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.form',
			version: 1,
			config: {
				parameters: {
					options: {
						customCss:
							'/* Apply to all n8n form pages */\n.card {\n	position: relative;\n	max-width: 500px;\n	margin: 20px auto;\n	padding: 20px;\n	background: white !important;\n	border-radius: 12px;\n	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);\n	font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;\n}\n\n.card:before {\n	content: \'\';\n	display: block;\n	height: 50px;\n	background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);\n	position: relative;\n	margin: -20px -20px 30px -20px;\n	border-radius: 12px 12px 0 0;\n}\n\n.card h1, .card h2 {\n	text-align: center !important;\n	color: #1f2937 !important;\n	font-weight: 700 !important;\n	margin: 15px 0 !important;\n	font-size: 2em !important;\n}\n\n.card p {\n	font-size: 1.1em !important;\n	line-height: 1.5 !important;\n}\n\n.inputs-wrapper {\n	position: relative;\n}\n\n.form-group {\n  margin-bottom: 15px;\n}\n\n.card input, .card textarea, .card select {\n	width: 100% !important;\n	padding: 12px 16px !important;\n	border: 2px solid #e5e7eb !important;\n	border-radius: 8px !important;\n	font-size: 16px !important;\n	box-sizing: border-box !important;\n	transition: border-color 0.3s ease !important;\n}\n\n.card input:focus, .card textarea:focus, .card select:focus {\n	border-color: #6366f1 !important;\n	box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;\n	outline: none !important;\n}\n\n.card button[type="submit"] {\n	background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%) !important;\n	color: white !important;\n	padding: 15px 40px !important;\n	border-radius: 10px !important;\n	font-size: 18px !important;\n	font-weight: 600 !important;\n	cursor: pointer !important;\n	width: 100% !important;\n	box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3) !important;\n	transition: all 0.3s ease !important;\n}\n\n.card button[type="submit"]:hover {\n	transform: translateY(-2px) !important;\n	box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4) !important;\n}\n\n.error-hidden {\n    display: block;\n    position: relative;\n    color: var(--color-error);\n    text-align: left;\n    font-size: var(--font-size-error);\n    font-weight: 400;\n    visibility: hidden;\n    padding-top: 0;\n    padding-bottom: 0;\n}\n\n@media (max-width: 768px) {\n	.card {\n		margin: 10px !important;\n		padding: 15px !important;\n	}\n	.card h1, .card h2 {\n		font-size: 1.6em !important;\n	}\n  .card:before {\n    margin: -20px -15px 30px -15px;\n  }\n}\n',
						formTitle: 'Enrich Prompt',
						buttonLabel: 'Answer',
					},
					formFields: {
						values: [
							{
								fieldType: 'textarea',
								fieldLabel: 'What do you want to build ?',
								placeholder: 'i.e.  A B2B proposal generator for content marketing agency',
								requiredField: true,
							},
							{
								fieldType: 'textarea',
								fieldLabel: 'Tools I can access (N/A if no tools)',
								placeholder: 'i.e. Web Search, Email Threads, Google Sheets',
								requiredField: true,
							},
							{
								fieldType: 'textarea',
								fieldLabel: 'What Input can be expected ?',
								placeholder: 'i.e. The customer data like name, company, problems you can solve.',
								requiredField: true,
							},
							{
								fieldType: 'textarea',
								fieldLabel: 'What output do you expect ?',
								placeholder: 'i.e. A proposal for the company that is specific to the customer',
								requiredField: true,
							},
						],
					},
				},
				position: [-920, -20],
				name: 'BaseQuestions',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.6,
			config: {
				parameters: {
					text: '={{ $json }}',
					messages: {
						messageValues: [
							{
								message:
									'<role>\nYou are an expert LLM-based prompt refinement agent. Your goal is to analyze vague or semi-structured input from a user who wants to build an automation or AI-based tool. Based on what they share, your task is to generate 3 **highly specific** questions that, if answered, would help a prompt engineer craft a more tailored and effective prompt for the tool they wish to build. The questions you generate should be very specific to the ai agent the user wants to build, and completely relevant for the idea they want to build it for.\n</role>\n\n<input>\nYou will receive a JSON-like array with the following fields:\n- "What do you want to build ?" – Describes the general idea.\n- "Tools I can access (N/A if no tools)" – Lists any tools/services the user can integrate.\n- "What Input can be expected ?" – The user input or data source for the tool.\n- "What output do you expect ?" – The final result the tool should generate.\n- "Any Constraints for the tool (N/A if no constraints)" – Character/length/performance/time restrictions.\n\nEach field is plain text. The values may vary in clarity and depth.\n</input>\n\n<tools>\nYou do not have access to external tools. Only the given input array and your own reasoning ability are available. You cannot fetch additional context.\n</tools>\n\n<instructions>\n1. Parse and understand the user\'s goal.\n2. Identify any ambiguity or key gaps in what’s provided.\n3. Generate **3 clear, concise follow-up questions** that would best clarify:\n   - Context or tone expectations\n   - Format or structure needed\n   - Any target audience or usage specifics\n4. Explain **why** each question is important (in 1–2 sentences).\n5. Return your output in the strict JSON array format defined above.\n6. Identify missing but critical details that would affect how an AI agent should behave.\n7. For each missing detail, create one structured form field in the output format.\n8. Use fieldLabel for the question, placeholder to guide, and set requiredField appropriately.\n9. Optionally specify fieldType (e.g., textarea for long text, dropdown if fixed options are obvious).\n</instructions>\n\n<constraints>\n\nYour output must be in the following format:\n\n[\n  {\n    "fieldLabel": "Label for the question to ask",\n    "placeholder": "Short hint to guide the user’s answer",\n    "requiredField": true or false,\n    "fieldType": "number" | "email" | "textarea" | "dropdown" (not optional; take default as \'textarea\')\n  }\n]\n\n- Ask no more than 3 questions.\n- Only ask questions that meaningfully impact how the tool would be built or how the AI would behave.\n- Your questions must be simple, not technical or abstract.\n- Do not repeat or rephrase questions already answered in the input.\n- Be practical — ask questions that a human prompt engineer would truly need to ask to make the result more useful.\n</constraints>\n\n<output>\n[\n  {\n    "fieldLabel": "Preferred tone or style for the LinkedIn post",\n    "placeholder": "e.g., professional, friendly, witty",\n    "requiredField": true,\n    "fieldType": "textarea"\n  },\n  {\n    "fieldLabel": "Should the post summarize the video or extract quotes?",\n    "placeholder": "e.g., summary only, key quotes, both",\n    "requiredField": true,\n    "fieldType": "textarea"\n  },\n  {\n    "fieldLabel": "Who is the target audience for the LinkedIn post?",\n    "placeholder": "e.g., hiring managers, founders, general network",\n    "requiredField": false,\n    "fieldType": "textarea"\n  }\n]\n</output>',
							},
						],
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [-700, -20],
				name: 'RelatedQuestionAI',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'output' },
				position: [-280, -20],
				name: 'SplitQuestions',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [0, 60], name: 'LoopQuestions' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.1,
			config: { position: [500, -20], name: 'MergeUserIntent' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.6,
			config: {
				parameters: {
					text: "={{ $('MergeUserIntent').item.json }}",
					messages: {
						messageValues: [
							{
								message:
									'<role>\nYou are an expert AI prompt generator designed to turn semi-structured user inputs into effective and well-formatted prompts for downstream AI agents. Your goal is to craft high-quality prompts that follow strict formatting and enable the target AI agent to perform its task optimally. And to do that you\'ll be receiving the user\'s input like what they want to build, which tool AI can use, what input the ai need to expect and what output the user want from their ai agent. Also you\'ll be receiving some specific constraints for the ai agent to be taken care along with some clarifying questions.\n</role>\n\n<inputs>\nYou will receive a JSON array that includes:\n- The user\'s primary intent (e.g., what they want to build)\n- What tools they plan to use (or "N/A")\n- What input the tool will receive\n- What output they expect\n- Any constraints (e.g., token limits, length)\n- Up to 3 additional form answers for clarifying context (e.g., tone, style, audience)\n\nExample input:\n[\n  {\n    "What do you want to build ?": "Video to LinkedIn post",\n    "Tools I can access (N/A if no tools)": "N/A",\n    "What Input can be expected ?": "video",\n    "What output do you expect ?": "LinkedIn Post",\n    "submittedAt": "2025-06-12T00:47:05.645+05:30",\n    "formMode": "test"\n  },\n  {\n    "Preferred tone or style for the LinkedIn post": "witty",\n    "submittedAt": "2025-06-12T01:15:11.608+05:30",\n    "formMode": "test"\n  },\n  {\n    "Should the post summarize the video or extract quotes?": "both",\n    "submittedAt": "2025-06-12T01:15:14.925+05:30",\n    "formMode": "test"\n  },\n  {\n    "Who is the target audience for the LinkedIn post?": "general network",\n    "submittedAt": "2025-06-12T01:15:20.045+05:30",\n    "formMode": "test"\n  }\n]\n</inputs>\n\n<tools>\nYou do not have access to APIs, databases, or external documents. Use only the input provided.\n</tools>\n\n<instructions>\n1. Parse and extract all user-provided values from the JSON array.\n2. Understand the user’s goal, expected inputs and outputs, and key contextual details.\n3. Using that information, generate a final prompt in strictly the following format (Critics) where r and c will change the position r first and then c:\n\n- **<constraints>**: Any boundaries (length, style, tone, technical limits)\n- **<role>**: What the downstream AI agent’s expertise and purpose should be  \n- **<inputs>**: What inputs it will receive, in what format, and example values  \n- **<tools>**: Any tools or data sources it can or cannot access  \n- **<instructions>**: Step-by-step guidance for the agent to perform its task  \n- **<conclusions>**: What kind of output it should generate, with format or examples  \n\n4. Ensure the final prompt is useful for a general-purpose LLM, without ambiguity.\n</instructions>\n\n<constraints>\n- Always include all 6 sections: Role, Inputs, Tools, Instructions, Constraints, Conclusions\n- Be specific and concise, avoid generic phrasing\n- Do not include timestamps or metadata like "formMode" or "submittedAt"\n- Output must be readable by a prompt engineer or AI agent directly\n</constraints>\n\n<conclusions>\nYour output will be a complete structured prompt, ready to be used by a downstream LLM for task execution.\n\nExample output:\n<role>\nYou are an AI assistant that transforms short videos into compelling LinkedIn posts. Your job is to summarise the video, extract powerful quotes, and write in a witty tone suitable for a general professional audience.\n</role>\n\n<inputs>\nYou will receive:\n- A video (maximum 5 minutes)\n- Preferences for tone: witty\n- Summary style: both (summarize and extract quotes)\n- Target audience: general network\n</inputs>\n\n<tools>\nYou do not have access to external APIs or web search. You can assume the video has already been transcribed for processing.\n</tools>\n\n<instructions>\n1. Parse the video transcript and understand its core message.\n2. Identify key insights and at least one memorable quote.\n3. Write a LinkedIn post that begins with a strong hook, reflects a witty tone, and engages the general network.\n4. Balance insight and personality while staying platform-native.\n</instructions>\n\n<constraints>\n- Keep the post under 3000 characters\n- Avoid technical jargon unless it serves the audience\n- No generic intros or robotic tone\n</constraints>\n\n<conclusions>\nReturn a single, polished LinkedIn post. Example:\n\n---\n“Most products don’t need onboarding. They need rethinking.”\n\nJust watched a great clip on UX that reminded me how design isn’t about making things easier — it’s about making them unnecessary.\n\n#UX #DesignThinking\n---\n</conclusions>\n\n<output>\nReturn strictly only a JSON object like this:\n{\n  "prompt": "<your generated prompt string>"\n}\nDo NOT wrap it inside code blocks or markdown.\n</output>',
							},
						],
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [740, -20],
				name: 'PromptGenerator',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.form',
			version: 1,
			config: {
				parameters: {
					options: {
						customCss:
							".card {\n	position: relative;\n	max-width: 500px;\n	margin: 20px auto;\n	padding: 20px;\n	background: #fefefe !important;\n	border-radius: 12px;\n	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);\n	font-family: 'Courier New', monospace;\n	color: #1f2937;\n	font-size: 16px;\n	line-height: 1.6;\n	white-space: pre-wrap;\n}\n\n.header p {\n  text-align: left;\n}\n\n@media (max-width: 768px) {\n	.card {\n		margin: 10px !important;\n		padding: 15px !important;\n		font-size: 14px;\n	}\n}\n",
					},
					operation: 'completion',
					completionTitle: "🎉 Here's your custom prompt",
					completionMessage:
						"={{ $('PromptGenerator').item.json.output.prompt }}\n\n---------------------------\n\n📋 You can now copy and use it anywhere!",
				},
				position: [1280, -20],
				name: 'SendingPrompt',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.form',
			version: 1,
			config: {
				parameters: {
					options: {
						customCss:
							'/* Apply to all n8n form pages */\n.card {\n	position: relative;\n	max-width: 500px;\n	margin: 20px auto;\n	padding: 20px;\n	background: white !important;\n	border-radius: 12px;\n	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);\n	font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;\n}\n\n.card:before {\n	content: \'\';\n	display: block;\n	height: 50px;\n	background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);\n	position: relative;\n	margin: -20px -20px 30px -20px;\n	border-radius: 12px 12px 0 0;\n}\n\n.card h1, .card h2 {\n	text-align: center !important;\n	color: #1f2937 !important;\n	font-weight: 700 !important;\n	margin: 15px 0 !important;\n	font-size: 2em !important;\n}\n\n.card p {\n	font-size: 1.1em !important;\n	line-height: 1.5 !important;\n}\n\n.inputs-wrapper {\n	position: relative;\n}\n\n.form-group {\n  margin-bottom: 15px;\n}\n\n.card input, .card textarea, .card select {\n	width: 100% !important;\n	padding: 12px 16px !important;\n	border: 2px solid #e5e7eb !important;\n	border-radius: 8px !important;\n	font-size: 16px !important;\n	box-sizing: border-box !important;\n	transition: border-color 0.3s ease !important;\n}\n\n.card input:focus, .card textarea:focus, .card select:focus {\n	border-color: #6366f1 !important;\n	box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;\n	outline: none !important;\n}\n\n.card button[type="submit"] {\n	background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%) !important;\n	color: white !important;\n	padding: 15px 40px !important;\n	border-radius: 10px !important;\n	font-size: 18px !important;\n	font-weight: 600 !important;\n	cursor: pointer !important;\n	width: 100% !important;\n	box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3) !important;\n	transition: all 0.3s ease !important;\n}\n\n.card button[type="submit"]:hover {\n	transform: translateY(-2px) !important;\n	box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4) !important;\n}\n\n.error-hidden {\n    display: block;\n    position: relative;\n    color: var(--color-error);\n    text-align: left;\n    font-size: var(--font-size-error);\n    font-weight: 400;\n    visibility: hidden;\n    padding-top: 0;\n    padding-bottom: 0;\n}\n\n@media (max-width: 768px) {\n	.card {\n		margin: 10px !important;\n		padding: 15px !important;\n	}\n	.card h1, .card h2 {\n		font-size: 1.6em !important;\n	}\n  .card:before {\n    margin: -20px -15px 30px -15px;\n  }\n}\n',
						formTitle: 'Questions to understand',
						buttonLabel: 'Answer',
					},
					defineForm: 'json',
					jsonOutput: "=[{{ $('LoopQuestions').item.json }}]",
				},
				position: [260, 80],
				name: 'RelevantQuestions',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {}, modelName: 'models/gemini-2.0-flash' },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [-680, 180],
				name: 'Google Gemini Chat Model',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			version: 1.2,
			config: {
				parameters: {
					jsonSchemaExample:
						'[\n  {\n    "fieldLabel": "Label for the question to ask",\n    "placeholder": "Short hint to guide the user’s answer",\n    "requiredField": true,\n    "fieldType": "text"\n  }\n]',
				},
				position: [-520, 180],
				name: 'Structured Output Parser',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {}, modelName: 'models/gemini-2.0-flash' },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [760, 360],
				name: 'Google Gemini Chat Model1',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.outputParserAutofixing',
			version: 1,
			config: {
				parameters: { options: {} },
				position: [880, 140],
				name: 'Auto-fixing Output Parser',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			version: 1.2,
			config: {
				parameters: { jsonSchemaExample: '{\n	"prompt": "this is the prompt"\n}' },
				position: [960, 360],
				name: 'Structured Output Parser1',
			},
		}),
	)
	.add(
		sticky(
			"# Prompting\n\n- Constraints/Rules - [rules I need to abide by] - Defines boundaries, limitations, and guidelines for operation \n- Role/Scope - [what am I an expert of?] - Establishes the agent's purpose, identity, and overall objective \n- Inputs - [tell me what inputs I'm receiving] - Specifies expected data formats & parameters (inc. examples)\n- Tools - [what resources can I access? e.g. web search] - Outlines available resources, functions, and capabilities\n- Instructions/Tasklist - [order of tasks] - Provides step-by-step procedures with examples\n- Conclusions/Outputs - [what output am I providing (examples)] - Defines expected response formats and deliverables\n- Solutions/Error handling - [what do I do if I don't get the information I expected to?] - Addresses troubleshooting and exception\nmanagement|",
			{ position: [-1220, 380], width: 900, height: 300 },
		),
	)
	.add(
		sticky('# Initiate and Get the Basic Questions', {
			name: 'Sticky Note1',
			position: [-1220, -160],
			width: 440,
			height: 320,
		}),
	)
	.add(
		sticky('# Generate Relevant Questions', {
			name: 'Sticky Note2',
			position: [-760, -160],
			width: 380,
			height: 500,
		}),
	)
	.add(
		sticky('# Ask question to the user', {
			name: 'Sticky Note3',
			position: [-320, -160],
			width: 960,
			height: 500,
		}),
	)
	.add(
		sticky('# Prompt Generator System', {
			name: 'Sticky Note4',
			position: [660, -160],
			width: 520,
			height: 680,
		}),
	)
	.add(
		sticky('# Sending the Prompt to User', {
			name: 'Sticky Note5',
			position: [1220, -160],
			width: 300,
			height: 320,
		}),
	)
	.add(
		sticky('# 🚀 AI Prompt generator', {
			name: 'Sticky Note6',
			color: 7,
			position: [-1220, -300],
			width: 440,
			height: 100,
		}),
	);
